import "server-only";

/**
 * Gerador de QR Code puro (byte mode) — SEM dependência externa.
 *
 * Motivo: o site precisa transformar o `qrToken` de um ingresso emitido num QR
 * scaneável, mas não queremos puxar uma lib pesada. Esta é uma adaptação enxuta
 * do algoritmo de referência de QR Code (Project Nayuki, domínio público) —
 * apenas o suficiente pra codificar uma string curta (o token do ingresso) em
 * byte mode com correção de erro nível M e escolha automática de máscara/versão.
 *
 * A função pública é {@link encodeQrToMatrix}, que devolve uma matriz booleana
 * (módulos preto/branco). O componente `QRCode.tsx` renderiza isso como SVG no
 * server — nada roda no cliente e nenhum segredo é envolvido (o token já é
 * público pro dono do pedido).
 */

export type Ecc = "L" | "M" | "Q" | "H";

const ECC_ORDINAL: Record<Ecc, number> = { L: 0, M: 1, Q: 2, H: 3 };

// -- Tabelas do padrão QR (ISO/IEC 18004) ---------------------------------

// Nº de codewords de correção de erro por bloco, indexado [eccOrdinal][version].
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  // Version: (unused) 1, 2, 3, 4, 5, 6, ...
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // L
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // M
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Q
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // H
];

const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // L
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // M
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Q
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // H
];

const MIN_VERSION = 1;
const MAX_VERSION = 40;
const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// -- Reed-Solomon (aritmética em GF(256)) ---------------------------------

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function reedSolomonComputeDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j]!, root);
      if (j + 1 < result.length) result[j] ^= result[j + 1]!;
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0]!;
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i++) {
      result[i] ^= reedSolomonMultiply(divisor[i]!, factor);
    }
  }
  return result;
}

// -- Utilitários de versão ------------------------------------------------

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(ver: number, ecc: Ecc): number {
  const e = ECC_ORDINAL[ecc];
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[e]![ver]! * NUM_ERROR_CORRECTION_BLOCKS[e]![ver]!
  );
}

// byte-mode: header = mode(4) + charCountBits + data
function byteModeCharCountBits(ver: number): number {
  if (ver <= 9) return 8;
  if (ver <= 26) return 16;
  return 16;
}

// -- Construção do bit-buffer ---------------------------------------------

class BitBuffer {
  readonly bits: number[] = [];
  appendBits(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  }
}

// -- Matriz ---------------------------------------------------------------

class QrMatrix {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly isFunction: boolean[][];

  constructor(
    public readonly version: number,
    private readonly ecc: Ecc,
    dataCodewords: Uint8Array,
    mask: number,
  ) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    // Escolhe a máscara (ou usa a dada) minimizando penalidade.
    let chosen = mask;
    if (chosen < 0) {
      let minPenalty = Infinity;
      for (let i = 0; i < 8; i++) {
        this.applyMask(i);
        this.drawFormatBits(i);
        const penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          chosen = i;
          minPenalty = penalty;
        }
        this.applyMask(i); // desfaz (XOR de novo)
      }
    }
    this.applyMask(chosen);
    this.drawFormatBits(chosen);
  }

  private setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y]![x] = isDark;
    this.isFunction[y]![x] = true;
  }

  private drawFunctionPatterns(): void {
    const size = this.size;
    for (let i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);

    const alignPositions = this.getAlignmentPatternPositions();
    const numAlign = alignPositions.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === numAlign - 1) ||
          (i === numAlign - 1 && j === 0)
        )
          continue;
        this.drawAlignmentPattern(alignPositions[i]!, alignPositions[j]!);
      }
    }

    // Format e version info são preenchidos depois (placeholder reservado aqui).
    this.drawFormatBits(0);
    this.drawVersion();
  }

  private drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private getAlignmentPatternPositions(): number[] {
    if (this.version === 1) return [];
    const numAlign = Math.floor(this.version / 7) + 2;
    const step =
      this.version === 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result: number[] = [6];
    for (let pos = this.size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  private drawFormatBits(mask: number): void {
    const data = (ECC_ORDINAL[this.ecc] ^ 1) << 3 | mask; // formato: bits de ECC + máscara (mapeamento do padrão)
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
    this.setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
    this.setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
    this.setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);

    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, ((bits >>> i) & 1) !== 0);
    this.setFunctionModule(8, this.size - 8, true); // módulo escuro fixo
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;

    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  private addEccAndInterleave(data: Uint8Array): Uint8Array {
    const ver = this.version;
    const e = ECC_ORDINAL[this.ecc];
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e]![ver]!;
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e]![ver]!;
    const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks: Uint8Array[] = [];
    const rsDiv = reedSolomonComputeDivisor(blockEccLen);
    let k = 0;
    for (let i = 0; i < numBlocks; i++) {
      const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
      const dat = data.slice(k, k + datLen);
      k += datLen;
      const ecc = reedSolomonComputeRemainder(dat, rsDiv);
      const block = new Uint8Array(shortBlockLen + 1);
      block.set(dat, 0);
      // deixa 1 byte de "buraco" nos blocos curtos pra alinhar o interleave
      block.set(ecc, block.length - blockEccLen);
      blocks.push(block);
    }

    const result = new Uint8Array(rawCodewords);
    let idx = 0;
    const maxBlockLen = shortBlockLen + 1;
    for (let i = 0; i < maxBlockLen; i++) {
      for (let j = 0; j < blocks.length; j++) {
        // pula o byte de padding dos blocos curtos na posição de dados
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
          result[idx++] = blocks[j]![i]!;
        }
      }
    }
    return result;
  }

  private drawCodewords(data: Uint8Array): void {
    let i = 0; // índice de bit
    const size = this.size;
    // Zig-zag de baixo-direita pra cima, em pares de colunas, pulando a coluna
    // de timing (x=6). Ao chegar em `right === 6`, ajusta pra 5 ANTES do
    // decremento — assim a próxima coluna vira 3 (e não 4), como no padrão.
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let k = 0; k < 2; k++) {
          const x = right - k;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y]![x] && i < data.length * 8) {
            this.modules[y]![x] = ((data[i >>> 3]! >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }

  private applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y]![x]) continue;
        let invert = false;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (invert) this.modules[y]![x] = !this.modules[y]![x];
      }
    }
  }

  private getPenaltyScore(): number {
    let result = 0;
    const size = this.size;
    // Regras N1 (linhas/colunas), N2 (blocos), N3 (padrão finder-like), N4 (balanço).
    for (let y = 0; y < size; y++) {
      let runColor = false;
      let runX = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < size; x++) {
        if (this.modules[y]![x] === runColor) {
          runX++;
          if (runX === 5) result += PENALTY_N1;
          else if (runX > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runX, runHistory);
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
          runColor = this.modules[y]![x]!;
          runX = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * PENALTY_N3;
    }
    for (let x = 0; x < size; x++) {
      let runColor = false;
      let runY = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < size; y++) {
        if (this.modules[y]![x] === runColor) {
          runY++;
          if (runY === 5) result += PENALTY_N1;
          else if (runY > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runY, runHistory);
          if (!runColor) result += this.finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
          runColor = this.modules[y]![x]!;
          runY = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * PENALTY_N3;
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = this.modules[y]![x];
        if (
          c === this.modules[y]![x + 1] &&
          c === this.modules[y + 1]![x] &&
          c === this.modules[y + 1]![x + 1]
        ) {
          result += PENALTY_N2;
        }
      }
    }
    let dark = 0;
    for (const row of this.modules) for (const v of row) if (v) dark++;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * PENALTY_N4;
    return result;
  }

  private finderPenaltyAddHistory(currentRunLength: number, runHistory: number[]): void {
    if (runHistory[0] === 0) currentRunLength += this.size; // acrescenta borda clara
    runHistory.pop();
    runHistory.unshift(currentRunLength);
  }

  private finderPenaltyCountPatterns(runHistory: number[]): number {
    const n = runHistory[2]!;
    const core =
      n > 0 &&
      runHistory[1] === n &&
      runHistory[3] === n * 3 &&
      runHistory[4] === n &&
      runHistory[5] === n;
    return (
      (core && runHistory[0]! >= n * 4 && runHistory[6]! >= n ? 1 : 0) +
      (core && runHistory[6]! >= n * 4 && runHistory[0]! >= n ? 1 : 0)
    );
  }

  private finderPenaltyTerminateAndCount(
    currentRunColor: boolean,
    currentRunLength: number,
    runHistory: number[],
  ): number {
    if (currentRunColor) {
      this.finderPenaltyAddHistory(currentRunLength, runHistory);
      currentRunLength = 0;
    }
    currentRunLength += this.size;
    this.finderPenaltyAddHistory(currentRunLength, runHistory);
    return this.finderPenaltyCountPatterns(runHistory);
  }
}

/**
 * Codifica `text` (UTF-8, byte mode) num QR e devolve a matriz de módulos
 * (`true` = preto). Escolhe automaticamente a menor versão que cabe pro nível
 * de correção dado (default M) e a melhor máscara.
 */
export function encodeQrToMatrix(text: string, ecc: Ecc = "M"): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  // Descobre a menor versão que comporta os dados.
  let version = MIN_VERSION;
  for (; version <= MAX_VERSION; version++) {
    const dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
    const usedBits = 4 + byteModeCharCountBits(version) + bytes.length * 8;
    if (usedBits <= dataCapacityBits) break;
  }
  if (version > MAX_VERSION) {
    throw new Error("Dados excedem a capacidade máxima de um QR Code");
  }

  const bb = new BitBuffer();
  bb.appendBits(0x4, 4); // modo byte
  bb.appendBits(bytes.length, byteModeCharCountBits(version));
  for (const b of bytes) bb.appendBits(b, 8);

  const dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
  // Terminator + padding até byte cheio.
  bb.appendBits(0, Math.min(4, dataCapacityBits - bb.bits.length));
  bb.appendBits(0, (8 - (bb.bits.length % 8)) % 8);
  // Bytes de padding alternados 0xEC/0x11.
  for (let pad = 0xec; bb.bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
    bb.appendBits(pad, 8);
  }

  const dataCodewords = new Uint8Array(bb.bits.length >>> 3);
  bb.bits.forEach((bit, i) => {
    if (bit) dataCodewords[i >>> 3]! |= 1 << (7 - (i & 7));
  });

  const qr = new QrMatrix(version, ecc, dataCodewords, -1);
  return qr.modules;
}
