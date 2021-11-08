import colourConvert from "color-convert";
import data from "./data_copic.json";
import { RGB } from "color-convert/conversions";

interface CopicEntry {
  id: string;
  name: string;
  hex: string;
  rgbv: [string, string, string];
  rgb: string;
}

function isInteger(v: string | number): boolean {
  if (typeof v === "number") {
    return true;
  }
  const res = Number(v);
  return !isNaN(res) && `${res}` === v && Math.round(res) === res;
}

enum Model {
  CMYK = "CMYK",
  HSL = "HSL",
  HSV = "HSV",
  HWB = "HWB",
  LAB = "LAB",
  LCH = "LCH",
  RGB = "RGB",
  XYZ = "XYZ",
}
const models = Object.values(Model).sort();
const defaultModel = Model.LAB;

type ColourValue3 = [number, number, number];
type ColourValue4 = [number, number, number, number];

const convert: Record<Model, (rgb: RGB) => ColourValue3 | ColourValue4> = {
  [Model.CMYK]: colourConvert.rgb.cmyk,
  [Model.HSL]: colourConvert.rgb.hsl,
  [Model.HSV]: colourConvert.rgb.hsv,
  [Model.HWB]: colourConvert.rgb.hwb,
  [Model.LAB]: colourConvert.rgb.lab,
  [Model.LCH]: colourConvert.rgb.lch,
  [Model.RGB]: (rgb) => rgb,
  [Model.XYZ]: colourConvert.rgb.xyz,
};

function distance(x: number[] | string[], y: number[] | string[]): number {
  let n = 0;
  for (let i = 0; i < x.length; i++) {
    n += (Number(x[i]) - Number(y[i])) ** 2;
  }
  return Math.sqrt(n);
}

const fontSize = "9pt";

async function main() {
  // const res = ((window as any).copicData as any) as CopicEntry[];
  const res = data as CopicEntry[];
  const body = document.querySelector("body") as HTMLBodyElement;

  const input = body.appendChild(document.createElement("input"));
  input.setAttribute("type", "text");
  input.setAttribute("value", "100,200,100");

  const span = body.appendChild(document.createElement("span"));

  const table = body.appendChild(document.createElement("table"));
  const thead = table.appendChild(document.createElement("thead"));
  const tbody = table.appendChild(document.createElement("thead"));

  let lastModeVal: string | null = null;

  function updateSimilarity() {
    let val = input.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      val = [
        parseInt(val.substr(1, 2), 16).toString(10),
        parseInt(val.substr(3, 2), 16).toString(10),
        parseInt(val.substr(5, 2), 16).toString(10),
      ].join(",");
    }

    if (!val || val.split(",").length !== 3) {
      return;
    }
    for (const v of val.split(",")) {
      if (!isInteger(v)) {
        return;
      }
    }

    const rgb = (val.split(",") as string[]).map((v) => Number(v)) as [
      number,
      number,
      number
    ];

    const model = (document.querySelector(
      'input[name="mode"]:checked'
    ) as HTMLInputElement).value as Model;

    const curModeVal = `${model}|${rgb.join(",")}`;
    if (lastModeVal === curModeVal) {
      return;
    }
    lastModeVal = curModeVal;

    const modelValue = convert[model](rgb);

    input.setAttribute("style", `background-color:RGB(${rgb.join(",")})`);

    const mv = (v: number) => Math.max(Math.abs(v), Math.abs(255 - v));
    const maxDiff = distance(
      [0, 0, 0],
      [mv(modelValue[0]), mv(modelValue[1]), mv(modelValue[2])]
    );
    // const maxDiff = distance([0, 0, 0], [255, 255, 255]);

    const differences: { tr: HTMLTableRowElement; diff: number }[] = [];

    for (const tr of Array.from(tbody.children) as HTMLTableRowElement[]) {
      const diff: number = distance(
        modelValue,
        JSON.parse(tr.getAttribute(`data-${model}`)!)
      );

      const diffTD = tr.lastElementChild!;
      const prevTD = diffTD.previousElementSibling! as HTMLTableCellElement;
      diffTD.innerHTML = `${((1 - diff / maxDiff) * 100).toFixed(1)}%`;
      diffTD.setAttribute("style", "text-align:center;");

      prevTD.innerText = modelValue
        .map((v) => `${v}`.padStart(3, "0"))
        .join(", ");
      prevTD.setAttribute(
        "style",
        `font-size:${fontSize};background-color:RGB(${rgb.join(",")})`
      );

      differences.push({ tr, diff });
    }

    differences.sort((x, y) => {
      if (x.diff < y.diff) {
        return -1;
      } else if (x.diff > y.diff) {
        return +1;
      } else {
        return 0;
      }
    });

    for (const tr of Array.from(tbody.children) as HTMLTableRowElement[]) {
      tr.remove();
    }
    for (const e of differences) {
      tbody.appendChild(e.tr);
    }
  }
  input.onchange = input.onblur = input.onkeyup = input.onkeypress = input.onload = updateSimilarity;
  setTimeout(updateSimilarity, 1);

  for (const model of models) {
    const radio = span.appendChild<HTMLInputElement>(
      document.createElement("input")
    );
    radio.setAttribute("name", "mode");
    radio.setAttribute("value", model);
    radio.setAttribute("type", "radio");
    radio.setAttribute("id", `mode-${model}`);
    radio.checked = model === defaultModel;

    const label = document.createElement("label");
    span.appendChild(label);
    label.innerText = model;
    label.setAttribute("for", `mode-${model}`);

    radio.onclick = radio.onchange = updateSimilarity;
  }

  for (const txt of ["Copic ID", "Name", ...models, "", "Similarity"]) {
    const th = thead.appendChild<HTMLTableHeaderCellElement>(
      document.createElement("th")
    );
    th.innerText = txt;
  }

  for (const e of res.filter((e) => e.rgbv?.length)) {
    const tr = tbody.appendChild<HTMLTableRowElement>(
      document.createElement("tr")
    );

    let td = tr.appendChild<HTMLTableCellElement>(document.createElement("td"));
    td.innerHTML = e.id;

    td = tr.appendChild<HTMLTableCellElement>(document.createElement("td"));
    td.innerText = e.name;

    const rgbv = e.rgbv.map((v) => Number(v)) as [number, number, number];
    for (const model of models) {
      const val = convert[model](rgbv);
      td = tr.appendChild<HTMLTableCellElement>(document.createElement("td"));
      td.setAttribute(
        "style",
        `font-size:${fontSize};background-color:RGB(${e.rgb});padding:3px;`
      );
      td.innerHTML = val
        .map((v: string | number) => `${v}`.padStart(3, "0"))
        .join(",");
      tr.setAttribute(`data-${model}`, JSON.stringify(val));
    }

    td = tr.appendChild<HTMLTableCellElement>(document.createElement("td"));
    td = tr.appendChild<HTMLTableCellElement>(document.createElement("td"));
  }
}

window.addEventListener("DOMContentLoaded", (/*e*/) => main());
