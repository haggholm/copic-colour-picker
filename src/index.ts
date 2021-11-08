import convert from "color-convert";
import data from "./data_copic.json";
import { LCH } from "color-convert/conversions";

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
  return !isNaN(res) && `${res}` !== v && Math.round(res) === res;
}

enum Model {
  RGB = "RGB",
  HSV = "HSV",
  HSL = "HSL",
  HWB = "HWB",
  LCH = "LCH",
  LAB = "LAB",
}
const defaultModel = Model.LAB;

function distance(
  x: [number, number, number] | [string, string, string],
  y: [number, number, number] | [string, string, string]
): number {
  const a = x.map((v: any) => Number(v));
  const b = y.map((v: any) => Number(v));
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
}

const fontSize = "10pt";

async function main() {
  // const res = ((window as any).copicData as any) as CopicEntry[];
  const res = data as CopicEntry[];
  const body = document.querySelector("body") as HTMLBodyElement;

  const input = document.createElement("input");
  input.setAttribute("type", "text");
  input.setAttribute("value", "100,200,100");
  body.appendChild(input);

  const span = document.createElement("span");
  body.appendChild(span);

  const table = document.createElement("table") as HTMLTableElement;
  table.setAttribute("id", "copic-colour-table");
  body.appendChild(table);

  const thead = document.createElement("thead");
  table.appendChild(thead);

  const tbody = document.createElement("thead");
  table.appendChild(tbody);

  function hideAll() {
    for (const tr of Array.from(tbody.children)) {
      tr.setAttribute("style", "display: none");
    }
  }

  function showAll() {
    for (const tr of Array.from(tbody.children)) {
      tr.setAttribute("style", "");
    }
  }

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
      showAll();
      return;
    }
    for (const v of val.split(",")) {
      if (!isInteger(v)) {
        showAll();
      }
    }

    // hideAll();
    showAll();

    const rgb = (val.split(",") as string[]).map((v) => Number(v)) as [
      number,
      number,
      number
    ];

    const mode = (document.querySelector(
      'input[name="mode"]:checked'
    ) as HTMLInputElement).value as Model;

    const [r, g, b] = rgb;
    const values: Record<Model, [number, number, number]> = {
      [Model.RGB]: rgb,
      [Model.HSV]: convert.rgb.hsv(r, g, b),
      [Model.HSL]: convert.rgb.hsl(r, g, b),
      [Model.HWB]: convert.rgb.hwb(r, g, b),
      [Model.LCH]: convert.rgb.lch(r, g, b),
      [Model.LAB]: convert.rgb.lab(r, g, b),
    };
    const modelValue = values[mode];

    input.setAttribute("style", `background-color:RGB(${r},${g},${b})`);

    // const fn = (v: number) => Math.max(v, Math.abs(v - 255));
    // const maxDiff = Math.sqrt(fn(r) ** 2 + fn(g) ** 2 + fn(b) ** 2);
    const mv = (v: number) => {
      const abs = Math.abs(v);
      const max = Math.max(v, Math.abs(255 - v));
      return max;
    };
    // const maxDiff = distance([0, 0, 0], [255, 255, 255]);
    const maxDiff = distance(
      [0, 0, 0],
      [mv(modelValue[0]), mv(modelValue[1]), mv(modelValue[2])]
    );

    const differences: { tr: HTMLTableRowElement; diff: number }[] = [];

    for (const tr of Array.from(tbody.children) as HTMLTableRowElement[]) {
      const diffs: Record<Model, number> = {
        [Model.RGB]:
          distance(rgb, JSON.parse(tr.getAttribute("data-rgb")!)) / maxDiff,
        [Model.HSV]:
          distance(values.HSV, JSON.parse(tr.getAttribute("data-hsv")!)) /
          maxDiff,
        [Model.HSL]:
          distance(values.HSL, JSON.parse(tr.getAttribute("data-hsl")!)) /
          maxDiff,
        [Model.HWB]:
          distance(values.HWB, JSON.parse(tr.getAttribute("data-hwb")!)) /
          maxDiff,
        [Model.LCH]:
          distance(values.LCH, JSON.parse(tr.getAttribute("data-lch")!)) /
          maxDiff,
        [Model.LAB]:
          distance(values.LAB, JSON.parse(tr.getAttribute("data-lab")!)) /
          maxDiff,
        // mean: 0,
      };
      // diffs.mean = (diffs.rgb + diffs.hsv) / 2;
      console.log({ diffs });

      const diff: number = diffs[mode];

      const diffTD = tr.lastElementChild!;
      const prevTD = diffTD.previousElementSibling! as HTMLTableCellElement;
      diffTD.innerHTML = `${((1 - diff) * 100).toFixed(1)}%`;
      diffTD.setAttribute("style", "text-align:center;");

      prevTD.innerText = values[mode]
        .map((v) => `${v}`.padStart(3, "0"))
        .join(", ");
      prevTD.setAttribute(
        "style",
        `font-size:${fontSize};background-color:RGB(${r},${g},${b})`
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

  for (const model of Object.values(Model)) {
    const radio = document.createElement("input") as HTMLInputElement;
    span.appendChild(radio);
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

  for (const txt of [
    "Copic ID",
    "Name",
    "RGB",
    "HSV",
    "HSL",
    "HWB",
    "LCH",
    "LAB",
    "",
    "Similarity",
  ]) {
    const th = document.createElement("th");
    thead.appendChild(th);
    th.innerText = txt;
  }

  for (const e of res) {
    const tr = document.createElement("tr") as HTMLTableRowElement;
    const style = `font-size:${fontSize};background-color:RGB(${e.rgb})`;

    let td = document.createElement("td") as HTMLTableCellElement;
    // td.setAttribute("style", style);
    tr.appendChild(td);
    td.innerHTML = e.id;

    td = document.createElement("td");
    // td.setAttribute("style", style);
    tr.appendChild(td);
    td.innerText = e.name;

    if (e.rgbv?.length) {
      const [r, g, b] = e.rgbv.map((v) => Number(v));
      for (const model of ["rgb", "hsv", "hsl", "hwb", "lch", "lab"] as const) {
        const val = model === "rgb" ? e.rgbv : convert.rgb[model](r, g, b);
        td = document.createElement("td");
        td.setAttribute("style", style);
        tr.appendChild(td);
        td.innerHTML = val
          .map((v: string | number) => `${v}`.padStart(3, "0"))
          .join(", ");
        tr.setAttribute(`data-${model}`, JSON.stringify(val));
      }
    } else {
      continue;
    }

    td = document.createElement("td");
    // td.setAttribute("style", style);
    tr.appendChild(td);

    td = document.createElement("td");
    // td.setAttribute("style", style);
    tr.appendChild(td);

    tbody.appendChild(tr);
  }
}

window.addEventListener("DOMContentLoaded", (/*e*/) => main());
