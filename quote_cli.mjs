#!/usr/bin/env node
// ESM: Node 18+ 권장
import fs from "fs";
import path from "path";
import url from "url";

// -----------------------------
// CLI args
// -----------------------------
const argv = {};
for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
        const [k, v] = arg.slice(2).split("=");
        if (v !== undefined) {
            argv[k] = v;
        } else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) {
            argv[k] = process.argv[i + 1];
            i++;
        } else {
            argv[k] = true;
        }
    }
}

// helpers
const toArr = (v) =>
    !v ? [] : Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim()).filter(Boolean);

const here = path.dirname(url.fileURLToPath(import.meta.url));

// -----------------------------
// 입출력 로직
// -----------------------------
function loadJson(file) {
    const candidates = [];
    if (path.isAbsolute(file)) {
        candidates.push(file);
    } else {
        candidates.push(path.join(process.cwd(), file)); // 현재 터미널 위치 기준
        candidates.push(path.join(here, file));          // 스크립트 파일 위치 기준
    }

    for (const p of candidates) {
        try {
            const txt = fs.readFileSync(p, "utf-8");
            return JSON.parse(txt);
        } catch (_) {
            // try next candidate
        }
    }
    throw new Error(`JSON not found: ${file}\nTried:\n- ${candidates.join("\n- ")}`);
}

function findModel(models, id) {
    const m = models.find((x) => x.id === id);
    if (!m) throw new Error(`model not found: ${id}`);
    return m;
}
function findTrim(model, code) {
    const t = model.trims.find((x) => x.code === code);
    if (!t) throw new Error(`trim not found: ${code} (model=${model.id})`);
    return t;
}
function getColorExtra(model, colorCode) {
    if (!colorCode) return { extra: 0, name: "" };
    const c = (model.colors || []).find((x) => x.code === colorCode);
    return { extra: c?.extra ? Number(c.extra) : 0, name: c?.name ?? colorCode };
}

// -----------------------------
// 계산 로직 (네 프로젝트와 동일한 규칙)
// - 색상추가금도 옵션합계에 포함
// - 개소세 인하: exciseEligible ? (원-인하)*subtotal
// - 친환경: priceIsFinal=true면 트림 ecoDiscount만, 아니면 cap 방식
// -----------------------------
function calculateQuote(model, trim, selectedOptionCodes, opts = {}) {
    const colorExtra = opts.colorExtra ?? 0;
    const colorCode = opts.colorCode ?? "";
    const colorName = opts.colorName ?? "";

    const basePrice = Number(trim.basePrice) || 0;

    // 선택/기본 옵션 목록
    const selectedOptions = trim.options.filter(
        (o) => o.allowed !== false && (o.included || selectedOptionCodes.includes(o.code))
    );

    // 색상 항목도 옵션처럼 표시
    if (colorExtra > 0) {
        selectedOptions.push({
            code: `color:${colorCode || "unknown"}`,
            name: colorName || "외장색상",
            price: colorExtra,
            allowed: true,
        });
    }

    // 옵션합계(색상 포함, included=0원)
    const optionsTotal = selectedOptions.reduce((sum, o) => sum + (o.included ? 0 : Number(o.price || 0)), 0);

    // 과세표준
    const subtotal = basePrice + optionsTotal;

    // 정책(트림 > 모델 > 기본)
    const pol = {
        exciseEligible:
            (trim.pricing?.exciseEligible ?? model.pricing?.exciseEligible ?? true) === true,
        exciseOriginalRate:
            Number(trim.pricing?.exciseOriginalRate ?? model.pricing?.exciseOriginalRate ?? 0.05),
        exciseReducedRate:
            Number(trim.pricing?.exciseReducedRate ?? model.pricing?.exciseReducedRate ?? 0.035),

        ecoKind: trim.pricing?.ecoKind ?? model.pricing?.ecoKind ?? "none",
        ecoExciseCap: Number(trim.pricing?.ecoExciseCap ?? model.pricing?.ecoExciseCap ?? 0),
        ecoEducationCap: Number(trim.pricing?.ecoEducationCap ?? model.pricing?.ecoEducationCap ?? 0),

        // 스포티지 HEV/니로 EV/K5 HEV 같은 고정 감면
        priceIsFinal: Boolean(trim.pricing?.priceIsFinal ?? model.pricing?.priceIsFinal ?? false),
    };

    // 트림 고정 할인(= 친환경 고정 감면)
    const ecoFixed = Number(trim.ecoDiscount ?? model.ecoDiscount ?? 0);

    // ① 개소세 인하(원단위 버림)
    const discountInha = pol.exciseEligible
        ? Math.floor(subtotal * (pol.exciseOriginalRate - pol.exciseReducedRate))
        : 0;

    // ② 친환경 감면
    let ecoExciseDiscount = 0;
    let ecoEducationDiscount = 0;
    if (pol.priceIsFinal) {
        // 고정 감면만 사용
    } else if (pol.ecoKind !== "none" && (pol.ecoExciseCap > 0 || pol.ecoEducationCap > 0)) {
        const exciseAfterInha = Math.floor(subtotal * pol.exciseReducedRate); // 3.5%
        ecoExciseDiscount = Math.min(exciseAfterInha, pol.ecoExciseCap);
        ecoEducationDiscount = Math.min(Math.floor(ecoExciseDiscount * 0.3), pol.ecoEducationCap);
    }

    const ecoCombined = ecoFixed + ecoExciseDiscount + ecoEducationDiscount;

    // 최종가
    const total = subtotal - discountInha - ecoCombined;

    const lines = [
        { label: `기본가 (${trim.name})`, amount: basePrice },
        { label: "옵션 합계", amount: optionsTotal },
        ...(discountInha ? [{ label: "개소세 인하 혜택", amount: -discountInha }] : []),
        ...(ecoCombined ? [{ label: "친환경 세제 혜택", amount: -ecoCombined }] : []),
        { label: "총액", amount: total },
    ];

    return {
        basePrice,
        optionsTotal,
        subtotal,
        discountInha,
        ecoCombined,
        total,
        selectedOptions,
        lines,
    };
}

// -----------------------------
// 출력 유틸
// -----------------------------
const money = (n) => Number(n).toLocaleString("ko-KR");

function printResult({ modelId, trimCode, colorCode, result }) {
    console.log(`\n=== ${modelId} / ${trimCode} / color=${colorCode || "-"} ===`);
    for (const l of result.lines) {
        const sign = l.amount < 0 ? "-" : "";
        console.log(`${l.label.padEnd(16, " ")} : ${sign}${money(Math.abs(l.amount))}원`);
    }
    if (result.selectedOptions.length) {
        console.log("  └─ 옵션 내역:");
        for (const o of result.selectedOptions) {
            console.log(
                `     - ${o.name ?? o.code}  ${o.included ? "(기본)" : `(+${money(o.price)}원)`}`
            );
        }
    }
}

function pushCsvRow(rows, ctx, res) {
    const { modelId, trimCode, colorCode, selected } = ctx;
    rows.push([
        modelId,
        trimCode,
        colorCode || "",
        selected.join("|"),
        res.basePrice,
        res.optionsTotal,
        res.discountInha,
        res.ecoCombined,
        res.total,
    ]);
}

// -----------------------------
// 실행 (단건 또는 시나리오 파일)
// -----------------------------
function runOnce(modelsPath, modelId, trimCode, options, color) {
    const models = loadJson(modelsPath);
    const model = findModel(models, modelId);
    const trim = findTrim(model, trimCode);
    const { extra, name } = getColorExtra(model, color);
    const res = calculateQuote(model, trim, options, {
        colorExtra: extra,
        colorCode: color,
        colorName: extra > 0 ? `외장색상(${name})` : `외장색상`,
    });
    printResult({ modelId, trimCode, colorCode: color, selected: options, result: res });
    return res;
}

function runScenarios(modelsPath, scenariosPath, csvOutPath) {
    const scenarios = loadJson(scenariosPath);
    const models = loadJson(modelsPath);
    const csvRows = [["model", "trim", "color", "options", "base", "optTotal", "exciseCut", "ecoCut", "total"]];

    for (const s of scenarios) {
        const model = findModel(models, s.model);
        const trim = findTrim(model, s.trim);
        const { extra, name } = getColorExtra(model, s.color);
        const res = calculateQuote(model, trim, toArr(s.options), {
            colorExtra: extra,
            colorCode: s.color,
            colorName: extra > 0 ? `외장색상(${name})` : `외장색상`,
        });
        printResult({
            modelId: s.model,
            trimCode: s.trim,
            colorCode: s.color,
            selected: toArr(s.options),
            result: res,
        });
        if (csvOutPath) pushCsvRow(csvRows, { modelId: s.model, trimCode: s.trim, colorCode: s.color, selected: toArr(s.options) }, res);
    }

    if (csvOutPath) {
        const csv = csvRows.map((r) => r.join(",")).join("\n");
        fs.writeFileSync(csvOutPath, csv);
        console.log(`\nCSV 저장: ${csvOutPath}`);
    }
}

// -----------------------------
// 엔트리
// -----------------------------
(async function main() {
    const modelsPath = argv.models || "./data/cars.json";

    if (argv.scenarios) {
        const csvOut = argv.csv || null;
        runScenarios(modelsPath, argv.scenarios, csvOut);
        return;
    }

    // 단건 실행
    const model = argv.model;
    const trim = argv.trim;
    if (!model || !trim) {
        console.log(`사용법:
  node quote_cli.mjs --models ./data/cars.json --model <모델ID> --trim <트림코드> [--options smartkey,audio8] [--color UD]
  또는
  node quote_cli.mjs --models ./data/cars.json --scenarios ./scenarios.json [--csv ./result.csv]`);
        process.exit(1);
    }
    const options = toArr(argv.options);
    const color = argv.color || "";
    runOnce(modelsPath, model, trim, options, color);
})();