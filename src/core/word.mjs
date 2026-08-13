import fs from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const FONT = "Microsoft YaHei";
const COLORS = { navy: "203864", blue: "2E75B6", pale: "EAF2F8", gray: "606060", border: "B4C7E7" };
const CONTENT_WIDTH = 9360;

export async function writeWordOutput(markdown, { out, title = "GemBridge 分析报告" } = {}) {
  const outputPath = path.resolve(normalizeDocxPath(out || defaultWordName(title)));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const body = markdownToBlocks(markdown);
  const document = new Document({
    creator: "gembridge-analyzer",
    title,
    description: "GemBridge / 中国桥牌网公开成绩分析报告",
    styles: wordStyles(),
    numbering: wordNumbering(),
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080, header: 500, footer: 500 },
        },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "GemBridge Analyzer  |  ", color: COLORS.gray, size: 18 }), new TextRun({ children: [PageNumber.CURRENT], color: COLORS.gray, size: 18 })],
        })] }),
      },
      children: body,
    }],
  });
  await fs.writeFile(outputPath, await Packer.toBuffer(document));
  return outputPath;
}

function markdownToBlocks(markdown) {
  const lines = String(markdown).replace(/\r/g, "").split("\n");
  const children = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\|.*\|$/.test(line) && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i + 1] || "")) {
      const tableLines = [line];
      i += 2;
      while (i < lines.length && /^\|.*\|$/.test(lines[i])) tableLines.push(lines[i++]);
      children.push(markdownTable(tableLines));
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      children.push(new Paragraph({ heading: [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2][heading[1].length - 1], children: inlineRuns(heading[2]) }));
      i++;
      continue;
    }
    const bullet = /^-\s+(.+)$/.exec(line);
    if (bullet) {
      children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: inlineRuns(bullet[1]) }));
      i++;
      continue;
    }
    children.push(new Paragraph({ children: inlineRuns(line) }));
    i++;
  }
  return children;
}

function markdownTable(lines) {
  const rows = lines.map(line => splitRow(line));
  const columnCount = Math.max(...rows.map(row => row.length));
  const weights = rows.reduce((acc, row) => {
    for (let i = 0; i < columnCount; i++) acc[i] = Math.max(acc[i] || 0, Math.min(28, String(row[i] || "").length + 2));
    return acc;
  }, []);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const widths = weights.map(value => Math.floor(CONTENT_WIDTH * value / totalWeight));
  widths[widths.length - 1] += CONTENT_WIDTH - widths.reduce((sum, value) => sum + value, 0);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: widths,
    rows: rows.map((row, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: widths.map((width, cellIndex) => new TableCell({
        width: { size: width, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        shading: rowIndex === 0 ? { fill: COLORS.pale } : undefined,
        verticalAlign: "center",
        children: [new Paragraph({
          alignment: numericCell(row[cellIndex]) ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: row[cellIndex] || "", bold: rowIndex === 0, size: rowIndex === 0 ? 19 : 18 })],
        })],
      })),
    })),
    borders: tableBorders(),
  });
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim().replace(/\\\|/g, "|"));
}

function inlineRuns(text) {
  const runs = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|https?:\/\/\S+)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) runs.push(new TextRun(text.slice(cursor, match.index)));
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], font: "Consolas", shading: { fill: "F2F2F2" } }));
    else runs.push(new ExternalHyperlink({ link: match[0], children: [new TextRun({ text: match[0], color: "0563C1", underline: {} })] }));
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) runs.push(new TextRun(text.slice(cursor)));
  return runs.length ? runs : [new TextRun("")];
}

function wordStyles() {
  return {
    default: {
      document: { run: { font: FONT, size: 21, color: "202020" }, paragraph: { spacing: { after: 100, line: 280 } } },
      title: { run: { font: FONT, size: 34, bold: true, color: COLORS.navy }, paragraph: { spacing: { before: 0, after: 200 }, keepNext: true } },
      heading1: { run: { font: FONT, size: 28, bold: true, color: COLORS.blue }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true } },
      heading2: { run: { font: FONT, size: 24, bold: true, color: COLORS.navy }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true } },
    },
  };
}

function wordNumbering() {
  return {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 260 }, spacing: { after: 70, line: 280 } }, run: { font: FONT } },
      }],
    }],
  };
}

function tableBorders() {
  const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };
  return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
}

function numericCell(value) { return /^[+−-]?[\d.,%/（）()\s]+$/.test(String(value || "")); }
function normalizeDocxPath(value) { return /\.docx$/i.test(value) ? value : `${value}.docx`; }
function defaultWordName(title) { return `${sanitizeFilename(title)}.docx`; }
function sanitizeFilename(value) { return String(value).replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim() || "gembridge-report"; }
