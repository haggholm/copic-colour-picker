import { assert } from 'ts-essentials';
import colourConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import * as cookie from 'tiny-cookie';

import copicData from './data_copic.json';
import pcData from './data_prismacolor.json';

enum DataSet {
  Copic = 'Copic',
  Prismacolor = 'Prismacolor',
}

enum Cookie {
  DefaultModel = 'default-colour-space',
  DefaultProduct = 'default-product',
}

type DataEntry = { id: string; name: string } & (
  | { hex?: never; rgbv?: never; rgb?: never }
  | {
      hex: string;
      rgbv: [string, string, string];
      rgb: string;
    }
);

const dataSets: Record<DataSet, DataEntry[]> = {
  [DataSet.Copic]: copicData as DataEntry[],
  [DataSet.Prismacolor]: pcData as DataEntry[],
};

function isInteger(v: string | number): boolean {
  if (typeof v === 'number') {
    return true;
  }
  const res = Number(v);
  return !isNaN(res) && `${res}` === v && Math.round(res) === res;
}

enum Model {
  CMYK = 'CMYK',
  HSL = 'HSL',
  HSV = 'HSV',
  HWB = 'HWB',
  LAB = 'LAB',
  LCH = 'LCH',
  RGB = 'RGB',
  XYZ = 'XYZ',
}

const models = Object.values(Model).sort();

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

const fontSize = '9pt';

const ids = {
  table: 'colour-picker-table',
  searchValue: 'colour-value-input',
};

function getCurrentData(): DataEntry[] {
  const dataSetName = (document.querySelector(
    'input[name="product"]:checked'
  ) as HTMLInputElement).value as DataSet;
  console.log('Get data set:', dataSetName);

  return dataSets[dataSetName];
}

function updateTable() {
  let table: HTMLTableElement | null = document.getElementById(
    ids.table
  ) as HTMLTableElement | null;
  let tbody: HTMLElement | null;

  if (table) {
    tbody = table.querySelector('tbody')!;
  } else {
    const body = document.querySelector('body') as HTMLBodyElement;
    table = body.appendChild(
      document.createElement('table')
    ) as HTMLTableElement;
    table.setAttribute('id', ids.table);

    const thead = table.appendChild(document.createElement('thead'));
    tbody = table.appendChild(document.createElement('tbody'));

    for (const txt of ['Code', 'Name', ...models, '', 'Similarity']) {
      const th = thead.appendChild<HTMLTableHeaderCellElement>(
        document.createElement('th')
      );
      th.innerText = txt;
    }
  }

  assert(table);
  assert(tbody);

  Array.from(tbody.children ?? []).forEach((el) => el.remove());
  lastState = null;

  const data = getCurrentData();
  for (const e of data.filter((e) => e.rgbv?.length)) {
    const tr = tbody.appendChild<HTMLTableRowElement>(
      document.createElement('tr')
    );

    let td = tr.appendChild<HTMLTableCellElement>(document.createElement('td'));
    td.innerHTML = e.id;

    td = tr.appendChild<HTMLTableCellElement>(document.createElement('td'));
    td.innerText = e.name;

    const rgbv = e.rgbv!.map((v) => Number(v)) as [number, number, number];
    for (const model of models) {
      const val = convert[model](rgbv);
      td = tr.appendChild<HTMLTableCellElement>(document.createElement('td'));
      td.setAttribute(
        'style',
        `font-size:${fontSize};background-color:RGB(${e.rgb});padding:3px;`
      );
      td.innerHTML = val
        .map((v: string | number) => `${v}`.padStart(3, '0'))
        .join(',');
      tr.setAttribute(`data-${model}`, JSON.stringify(val));
    }

    td = tr.appendChild<HTMLTableCellElement>(document.createElement('td'));
    td = tr.appendChild<HTMLTableCellElement>(document.createElement('td'));
  }

  updateSimilarity();
}

let lastState: string | null;

function updateSimilarity() {
  const table = document.getElementById(ids.table) as HTMLTableElement;
  const tbody = table.querySelector('tbody');
  const colourInput = document.getElementById(
    ids.searchValue
  ) as HTMLInputElement;
  assert(tbody);
  assert(colourInput);

  let val = colourInput.value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    val = [
      parseInt(val.substr(1, 2), 16).toString(10),
      parseInt(val.substr(3, 2), 16).toString(10),
      parseInt(val.substr(5, 2), 16).toString(10),
    ].join(',');
  }

  if (!val || val.split(',').length !== 3) {
    return;
  }
  for (const v of val.split(',')) {
    if (!isInteger(v)) {
      return;
    }
  }

  const rgb = (val.split(',') as string[]).map((v) => Number(v)) as [
    number,
    number,
    number
  ];

  const dataSetName = (document.querySelector(
    'input[name="product"]:checked'
  ) as HTMLInputElement).value as Model;
  const model = (document.querySelector(
    'input[name="mode"]:checked'
  ) as HTMLInputElement).value as Model;

  const curState = `${dataSetName}|${model}|${rgb.join(',')}`;
  if (lastState === curState) {
    return;
  }
  lastState = curState;

  const modelValue = convert[model](rgb);
  console.log(`Find ${dataSetName} for colour RGB(${rgb.join(',')})`);

  colourInput.setAttribute('style', `background-color:RGB(${rgb.join(',')})`);

  const mv = (v: number) => Math.max(Math.abs(v), Math.abs(255 - v));
  const maxDiff = distance(
    modelValue.map((v) => 0),
    modelValue.map(mv)
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
    diffTD.setAttribute('style', 'text-align:center;');

    prevTD.innerText = modelValue
      .map((v) => `${v}`.padStart(3, '0'))
      .join(', ');
    prevTD.setAttribute(
      'style',
      `font-size:${fontSize};background-color:RGB(${rgb.join(',')})`
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

async function init() {
  const body = document.querySelector('body') as HTMLBodyElement;

  const defaultProduct: DataSet =
    cookie.get(Cookie.DefaultProduct) ?? DataSet.Copic;
  const defaultModel: Model = cookie.get(Cookie.DefaultModel) ?? Model.LAB;

  const optsTable = body.appendChild(document.createElement('table'));

  const productRow = optsTable.appendChild(document.createElement('tr'));
  const productTitleTD = productRow.appendChild(document.createElement('td'));
  productTitleTD.innerText = 'Product';
  const productDataTD = productRow.appendChild(document.createElement('td'));
  for (const product of Object.values(DataSet)) {
    const radio = productDataTD.appendChild<HTMLInputElement>(
      document.createElement('input')
    );
    radio.setAttribute('name', 'product');
    radio.setAttribute('value', product);
    radio.setAttribute('type', 'radio');
    radio.setAttribute('id', `product-${product}`);
    radio.checked = product === defaultProduct;

    const label = productDataTD.appendChild(document.createElement('label'));
    label.innerText = product;
    label.setAttribute('for', `product-${product}`);

    radio.onclick = label.onclick = () => {
      cookie.set(Cookie.DefaultProduct, product);
      updateTable();
    };
    radio.onchange = updateTable;
  }

  const modelRow = optsTable.appendChild(document.createElement('tr'));
  const modelTitleTD = modelRow.appendChild(document.createElement('td'));
  modelTitleTD.innerText = 'Colour space';
  const modelDataTD = modelRow.appendChild(document.createElement('td'));
  for (const model of models) {
    const radio = modelDataTD.appendChild<HTMLInputElement>(
      document.createElement('input')
    );
    radio.setAttribute('name', 'mode');
    radio.setAttribute('value', model);
    radio.setAttribute('type', 'radio');
    radio.setAttribute('id', `mode-${model}`);
    radio.checked = model === defaultModel;

    const label = document.createElement('label');
    modelDataTD.appendChild(label);
    label.innerText = model;
    label.setAttribute('for', `mode-${model}`);

    radio.onclick = label.onclick = () => {
      cookie.set(Cookie.DefaultModel, model);
      updateSimilarity();
    };
    radio.onchange = updateSimilarity;
  }

  const searchRow = optsTable.appendChild(document.createElement('tr'));
  const searchTitleTD = searchRow.appendChild(document.createElement('td'));
  searchTitleTD.innerText = 'Find colour';
  const searchDataTD = searchRow.appendChild(document.createElement('td'));
  const input = searchDataTD.appendChild(document.createElement('input'));
  input.setAttribute('id', ids.searchValue);
  input.setAttribute('type', 'text');
  input.setAttribute('value', '100,200,100');
  input.onchange = input.onblur = input.onkeyup = input.onkeypress = input.onload = updateSimilarity;

  updateTable();
}

window.addEventListener('DOMContentLoaded', (/*e*/) => init());
