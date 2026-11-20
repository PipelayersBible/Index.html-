import { keepForState, questionStates, tenStatesOnly } from "./state.ts";
import { SHELF_TOOL } from "./shelf.ts";
import { search } from "./_shared/retrieval.ts";
import { cleanUntrusted, docBlock } from "./guard.ts";
import { calc } from "./calc.ts";
const CODE_EXEC_TYPE = "code_execution_20260521",
  DATE = {
    type: "string",
    description: "YYYY-MM-DD. Leave out for the default (last 90 days ending today).",
  },
  PLAN_JOB = { type: "string", description: 'Job number exactly as listed in YOUR ACCESS, or the CURRENT JOB.' },
  JOB = {
    type: "string",
    description:
      'Job number exactly as listed in YOUR ACCESS (e.g. "24-201"). Leave out for all of your jobs.',
  },
  grp = (vals, d) => ({ type: "string", enum: vals, description: d }),
  NOTE_KINDS = ["all", "delay", "utility", "rework", "equip"],
  NOTE_GROUPS = ["all", "day", "week", "month", "job", "kind", "reason", "author"],
  DEFS = [{
    name: "calc",
    levels: ["individual", "pipelayer", "foreman", "office"],
    description:
      "Exact arithmetic. Use it for EVERY number you derive (sums, differences, divisions, percentages, per-day rates, unit conversions) instead of working it out yourself. One expression per call; call it several times in the same turn when you need several figures. A full math engine: + - * / ^, parentheses, round(x, places), ceil, floor, min, max, abs, sqrt, cbrt, exp, log (natural), log10, pi, e, hypot, mod, factorial, combinations; trig in DEGREES for plain numbers: sin, cos, tan, asin, acos, atan, atan2(y, x) (inverse functions return degrees; sin(1.2 rad) also works). Units convert: \"12 ft * 3 ft * 0.5 ft to yd^3\", \"2.5 in to ft\", \"350 gal to ft^3\", \"45 deg to rad\". Algebra: solve(\"x^2 + 3x = 10\", \"x\") or solve(\"...\", \"x\", low, high) finds the value(s) of x numerically (give a range when you know one). Geometry: circle_area(d), segment_area(d, depth) for a partly full pipe or round shape. Field: ftin(5, 3.5) or ftin(\"5' 3 1/2\\\"\") for feet-inches to decimal feet, to_ftin(5.2917) gives 5' 3-1/2\" (nearest 1/16); sta(\"12+50.25\") = 1250.25 ft, to_sta(1250.25) = 12+50.25; grade_pct(rise, run), in_per_ft(pct), pct_from_in_per_ft(x), elev_at(elev, pct, dist) (pct negative going down); pipe_cf(d_in, len_ft), pipe_gal(d_in, len_ft), trench_cy(w_ft, depth_ft, len_ft), bedding_cy(trench_w_ft, below_in, od_in, above_in, len_ft). Use it for EVERY kind of math: arithmetic, trig (miters, bevels, batter, offsets, slope angles), geometry (areas, volumes, arcs, chords), algebra (solve for an unknown) and unit conversions. Put a space after argument commas: round(7472.3 / 13, 1).",
    input_schema: {
      type: "object",
      properties: {
        expression: { type: "string", description: 'e.g. "round((9000 - 1527.7) / 13, 1)"' },
      },
      required: ["expression"],
    },
  }, {
    name: "propose_materials",
    levels: ["office"],
    description:
      "Show the person a proposed list of material totals for one job (from a plan takeoff), to review and save in the job's Materials. It saves nothing. Use it only when the person asks to put, add or update the amounts on the job. Every qty must be a calc result from this answer. Then tell them in one line to review it on the card.",
    input_schema: {
      type: "object",
      properties: {
        job: { type: "string", description: 'The job number, e.g. "24-101".' },
        items: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: 'e.g. "Concrete 2500 psi", "8" PVC SDR 35", "4" base rock"',
              },
              kind: {
                type: "string",
                enum: ["pipe", "fittings", "structures", "concrete", "asphalt", "base", "other"],
                description:
                  "pipe in LF; concrete in yd3; asphalt in ton; base = road base / base rock / gravel.",
              },
              qty: { type: "number" },
              unit: { type: "string", description: "LF, EA, yd3, ton, SF" },
              basis: {
                type: "string",
                description: "One short line: the figures and sheet it came from.",
              },
            },
            required: ["name", "kind", "qty", "unit"],
          },
        },
      },
      required: ["job", "items"],
    },
  }, {
    name: "search_knowledge",
    levels: ["individual", "pipelayer", "foreman", "office"],
    description:
      "Search the app's knowledge libraries again (field practice, verbatim OSHA text, app how-to) and the documents this person can see (their company library, local specs, shared public documents). Use it when the excerpts you were given do not cover the question. Returns numbered excerpts you can cite like the others.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Search words, e.g. "1926.651 spoil 2 feet edge" or "Phoenix trench backfill compaction".',
        },
        library: grp(
          ["any", "field", "osha", "app", "documents"],
          'Limit to one library. "documents" = uploaded company / area / shared documents.',
        ),
      },
      required: ["query"],
    },
  }, {
    name: "my_jobs",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_scope",
    args: () => ({}),
    label: () => "your jobs",
    description:
      "The jobs this person can see in the app, with city/state, start and end dates and last activity.",
    input_schema: { type: "object", properties: {} },
  }, {
    name: "plan_sheets",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_plan_sheets",
    args: (i) => ({ p_job: i.job }),
    label: (i) => `job ${i.job} plan sheets`,
    description:
      "The plan sets uploaded for one job: every sheet with its page, sheet number, title, discipline (water, sewer, storm, street...), streets and station range. Use it to find which sheet covers a street, a utility or a station range, and to answer 'which sheet shows ...'.",
    input_schema: { type: "object", properties: { job: PLAN_JOB }, required: ["job"] },
  }, {
    name: "plan_find",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_plan_find",
    args: (i) => ({ p_job: i.job, p_query: String(i.query || "").slice(0, 300), p_station: i.station || null, p_k: 12 }),
    label: (i) => `job ${i.job} plans: ${String(i.query || i.station || "").slice(0, 40)}`,
    description:
      "Search one job's uploaded plan set index: structures (manholes, catch basins, cleanouts) with rims and inverts, pipe runs (size, material, length, slope), valves, hydrants, fittings, services, crossings, callouts, construction and general notes, table rows and detail references. Give field words and labels (\"SSMH 3 invert\", \"8 inch water street B\", \"note 12\", \"thrust block\") and, when the question names one, a station (\"12+50\") to get what is near it. Results list the page and the tiles each value was read from: open them with plan_read before you state any value. Search again with other words (synonyms, the label as printed) if the first search misses.",
    input_schema: {
      type: "object",
      properties: {
        job: PLAN_JOB,
        query: { type: "string", description: "Field words, labels and numbers to look for." },
        station: { type: "string", description: "A station like 12+50 to find what is near it. Optional." },
      },
      required: ["job", "query"],
    },
  }, {
    name: "plan_issues",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_plan_issues",
    args: (i) => ({ p_job: i.job, p_query: String(i.query || "").slice(0, 120) }),
    label: (i) => `job ${i.job} plan discrepancies${i.query ? ": " + String(i.query).slice(0, 30) : ""}`,
    description:
      "Discrepancies found between sheets of the job's plans: the same structure or pipe printed with different values on different sheets or views (plan vs profile vs tables, storm drain vs grading vs street sets): rims, inverts, sizes, slopes, lengths, materials. Each was re-read off both drawings: state confirmed = both places really print different values; unclear = could not be re-read, check both sheets. Give a label (\"CB A-4\", \"SSMH 3\") to narrow it, or nothing for all. 'checking: true' means more are still being re-read.",
    input_schema: { type: "object", properties: { job: PLAN_JOB, query: { type: "string", description: "A structure or pipe label to narrow it. Optional." } }, required: ["job"] },
  }, {
    name: "plan_read",
    levels: ["pipelayer", "foreman", "office"],
    label: (i) => `plan page ${i.page} ${Array.isArray(i.tiles) ? i.tiles.join(",") : ""}`,
    description:
      "Open one plan sheet: returns the sheet's full index (every value read from it, with tiles) and the high-resolution images of up to 4 tiles of the actual drawing. Use the page and tiles from plan_find or plan_sheets. Read the value off the tile image yourself and use the image when it and the index differ (say so). Tiles are named rNcM (row from the top, column from the left) and overlap a little.",
    input_schema: {
      type: "object",
      properties: {
        job: PLAN_JOB,
        page: { type: "integer", description: "The page number in the plan set (from plan_find / plan_sheets)." },
        tiles: { type: "array", items: { type: "string" }, maxItems: 4, description: "Tile ids to look at, e.g. [\"r1c2\"]. Leave empty to get only the sheet's index and its tile list." },
        set: { type: "string", description: "The plan set's title when the job has more than one set. Optional." },
      },
      required: ["job", "page"],
    },
  }, {
    name: "job_summary",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_job_summary",
    args: (i) => ({ p_job: i.job }),
    label: (i) => `job ${i.job} summary`,
    description:
      "One job: each plan category planned vs done (the company dashboard numbers), percent complete, this week, today, schedule (time used vs work done; work_days_left and the list of remaining work dates from today to the end date, each marked is_today and production_recorded, by the app schedule rule Mon-Fri minus company holidays), last 14 days by category, open inspections, and ready-made metrics per category (planned, done, left, pct_done, best_day_date/best_day_qty, last_day_date/last_day_qty, avg_per_prod_day, prod_days, work_days_left, qty_per_day_needed) plus job_figures (pct_time_used, pct_work_done, ahead_behind_pct). Use these figures as given.",
    input_schema: { type: "object", properties: { job: JOB }, required: ["job"] },
  }, {
    name: "spoils",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_spoils",
    args: (i) => ({ p_job: i.job }),
    label: (i) => `job ${i.job} spoils`,
    description:
      "One job's spoils, the same figures as the app's Spoils section: haul_loose_yd3 = loose yd3 of spoil to haul from the work counted so far (bank yd3 x swell), bank_yd3, swell_pct, the job's truck_yd3 and loads (when a truck size is set), per-foot figures, and the whole-job expected amount. status says when a setting is missing (no trench width, no pipe size, no footage yet). Use it for any question about the spoil pile, haul-off or trucks to clear the dirt.",
    input_schema: { type: "object", properties: { job: JOB }, required: ["job"] },
  }, {
    name: "production",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_production",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? "week",
      p_group2: i.then_by ?? null,
      p_category: i.category ?? null,
    }),
    label: (i) =>
      `production by ${i.group_by ?? "week"}${i.then_by ? " and " + i.then_by : ""}${
        i.job ? ", job " + i.job : ""
      }`,
    description:
      "Counted production quantities (LF, EA, ...) grouped by day/week/month/job/crew/category/cost_code/pipe_size, plus pipe LF per pipe day and (office only) man-hours and LF per man-hour. Same counting rule as the company dashboard. Field users get only their own production. day_stats per category: best_day_date/best_day_qty, last_day_date/last_day_qty (most recent, not best), avg_per_prod_day, prod_days, total_qty for the range.",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        group_by: grp([
          "all",
          "day",
          "week",
          "month",
          "job",
          "crew",
          "category",
          "cost_code",
          "pipe_size",
        ], "First grouping."),
        then_by: grp(
          ["day", "week", "month", "job", "crew", "category", "cost_code", "pipe_size"],
          "Optional second grouping.",
        ),
        category: {
          type: "string",
          description:
            'Plan category key, e.g. "pipe", "excavation", "structures". Leave out for all.',
        },
      },
    },
  }, {
    name: "runs",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_runs",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? null,
    }),
    label: (i) => `run reports${i.group_by ? " by " + i.group_by : ""}`,
    description:
      "Run reports: date, job, run, crew, pipelayer, pipe size and type, laid vs planned feet, ended early, sent/reviewed. Leave group_by out for a list (newest 100) or group by day/week/month/job/crew/pipe_size/pipe_type.",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        group_by: grp(
          ["day", "week", "month", "job", "crew", "pipe_size", "pipe_type", "all"],
          "Optional grouping.",
        ),
      },
    },
  }, {
    name: "daily_reports",
    levels: ["foreman", "office"],
    rpc: "pb_ai_dailies",
    args: (i) => ({ p_job: i.job ?? null, p_from: i.from ?? null, p_to: i.to ?? null }),
    label: () => "daily reports",
    description:
      "Signed daily reports: date, job, who signed, headcount, crew hours, equipment pieces, delay entries and delay/standby hours.",
    input_schema: { type: "object", properties: { job: JOB, from: DATE, to: DATE } },
  }, {
    name: "delays",
    levels: ["foreman", "office"],
    rpc: "pb_ai_delays",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? "reason",
      p_group2: i.then_by ?? null,
    }),
    label: (i) => `delays by ${i.group_by ?? "reason"}`,
    description:
      "Delays, standby and extra work from daily reports: entries, hours, crew-hours (hours x crew size), not yet reviewed, grouped by reason/kind/job/foreman/day/week/month, plus the biggest examples.",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        group_by: grp(
          ["all", "reason", "kind", "job", "foreman", "day", "week", "month"],
          "First grouping.",
        ),
        then_by: grp(
          ["reason", "kind", "job", "foreman", "day", "week", "month"],
          "Optional second grouping.",
        ),
      },
    },
  }, {
    name: "run_notes",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_run_notes",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_kind: NOTE_KINDS.includes(i.kind) ? i.kind : "all",
      p_group: NOTE_GROUPS.includes(i.group_by) ? i.group_by : "kind",
      p_group2: NOTE_GROUPS.includes(i.then_by) && i.then_by !== (i.group_by ?? "kind")
        ? i.then_by
        : null,
    }),
    label: (i) =>
      `run notes${i.kind && i.kind !== "all" ? " (" + i.kind + ")" : ""} by ${
        i.group_by ?? "kind"
      }${i.then_by ? " and " + i.then_by : ""}${i.job ? ", job " + i.job : ""}`,
    description:
      "Run notes: the entries crews log during a run - delays (start, end, hours, reason), utility hits or finds, rework and equipment down - grouped by kind/reason/author/job/day/week/month. Each row: entries, hours, with_note_pct (entries with a written note), delays_timed_pct (delays with both start and end recorded), photos. Grouped by author it also gives run_sessions per author, the denominator for how consistently a person documents. Plus up to 40 recent examples (date, job, author, kind, reason, hours, start, end, station, damaged, notified, note). Use it for delay causes, utility damage, and for a pipelayer's documentation habits (promotion / leadership evidence). Office: the whole company; a foreman: his jobs; a pipelayer: his own entries.",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        kind: grp(
          ["all", "delay", "utility", "rework", "equip"],
          "One kind of note, default all.",
        ),
        group_by: grp(
          ["kind", "reason", "author", "job", "day", "week", "month", "all"],
          "First grouping, default kind.",
        ),
        then_by: grp(
          ["kind", "reason", "author", "job", "day", "week", "month"],
          "Optional second grouping.",
        ),
      },
    },
  }, {
    name: "tickets",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_tickets",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? "type",
      p_group2: i.then_by ?? null,
    }),
    label: (i) => `field tickets by ${i.group_by ?? "type"}`,
    description:
      "Field tickets: counts, concrete yd3, sub/trucking hours, grouped by type/supplier/cost_code/use/mix/job/day/week/month, plus material line items totalled. Field users see only their own tickets. No prices (the app tracks none).",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        group_by: grp([
          "all",
          "type",
          "supplier",
          "cost_code",
          "use",
          "mix",
          "job",
          "day",
          "week",
          "month",
        ], "First grouping."),
        then_by: grp(
          ["type", "supplier", "cost_code", "use", "mix", "job", "day", "week", "month"],
          "Optional second grouping.",
        ),
      },
    },
  }, {
    name: "materials",
    levels: ["foreman", "office"],
    rpc: "pb_ai_materials",
    args: (i) => ({ p_job: i.job }),
    label: (i) => `materials, job ${i.job}`,
    description:
      "One job's materials: planned vs used, percent used, variance, ordered, delivered (tickets), lead days. Foremen get the material list only.",
    input_schema: { type: "object", properties: { job: JOB }, required: ["job"] },
  }, {
    name: "inspections",
    levels: ["foreman", "office"],
    rpc: "pb_ai_inspections",
    args: (i) => ({ p_job: i.job ?? null, p_from: i.from ?? null, p_to: i.to ?? null }),
    label: () => "inspections and tests",
    description:
      "Inspections and tests: pass/fail/partial by kind in the period, open items, recent failures. Foremen see items assigned to them.",
    input_schema: { type: "object", properties: { job: JOB, from: DATE, to: DATE } },
  }, {
    name: "permits_summary",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_permits",
    args: (i) => ({ p_from: i.from ?? null, p_to: i.to ?? null }),
    label: () => "confined-space permit counts",
    description:
      "Confined-space permit COUNTS by job (opened, closed, open now). Never readings or entry conditions.",
    input_schema: { type: "object", properties: { from: DATE, to: DATE } },
  }, {
    name: "equipment_hours",
    levels: ["foreman", "office"],
    rpc: "pb_ai_equipment",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_std_hours: i.std_day_hours ?? 8,
    }),
    label: () => "equipment hours",
    description:
      "Equipment hours from daily reports: per piece days, hours, average per day, utilisation against a standard day, rentals flagged; the office also gets company units with no hours (idle).",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        std_day_hours: { type: "number", description: "Standard day for utilisation, default 8." },
      },
    },
  }, {
    name: "people_production",
    levels: ["foreman", "office"],
    rpc: "pb_ai_people_production",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_by: i.by ?? "foreman",
      p_person: i.person ?? null,
      p_category: i.category ?? "pipe",
      p_then: i.then_by ?? null,
    }),
    label: (i) =>
      `production by ${i.by === "pipelayer" ? "pipelayer" : "foreman"}${
        i.person ? ", " + i.person : ""
      }${i.job ? ", job " + i.job : ""}`,
    description:
      `Production PER PERSON: by pipelayer (whose run it was) or by foreman (whose crew did it). Use it for "best pipelayer", "compare Jose's and Mike's crews", "which foreman lays the most", one person's stats. Each row, already computed: rank (by qty), rank_by_avg, qty, prod_days, avg_per_prod_day, best_day_date/qty, worst_day_date/qty, last_day_date, jobs, man_hours and qty_per_man_hour; by foreman also daily_reports, daily_crew_hours, qty_per_crew_hour, delay_standby_hours, delay_crew_hours, insp_checks, insp_failed, insp_fail_pct; by pipelayer also runs_sent, run_laid_ft, runs_ended_early. Includes closed jobs. then_by job/month/week splits each person. Credit follows the app's crew rule: a pipelayer's run with no foreman picked goes to his CURRENT crew-link foreman, so say so when crews changed in the range. A foreman gets only his own crew (his entries by pipelayer).`,
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        by: grp(
          ["pipelayer", "foreman"],
          "Whose production: the pipelayer's or the foreman's (crew). Default foreman.",
        ),
        person: {
          type: "string",
          description:
            'Part of a name to show only that person, e.g. "Jose". Leave out to rank everyone.',
        },
        category: {
          type: "string",
          description: 'Plan category key, default "pipe" (LF). E.g. "structures", "excavation".',
        },
        then_by: grp(
          ["job", "month", "week"],
          "Optional split of each person by job, month or week.",
        ),
      },
    },
  }, {
    name: "company_overview",
    levels: ["office"],
    rpc: "pb_ai_company_overview",
    args: (i) => ({
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_include_closed: i.include_closed ?? !0,
    }),
    label: () => "company overview, all jobs",
    description:
      'Every job of the company INCLUDING CLOSED JOBS: closed and closed date, start/end, last work date, overall % done (dashboard), % time used, ahead/behind, pipe LF to date / planned / in the range, crew reporting, open inspections; plus company-wide totals per category in the range (closed jobs included) and company-wide day_stats (best / most recent / average day). Use for company totals ("total footage this year incl. closed jobs"), "how are all our jobs doing", "which job is furthest behind". For "this year" pass from = January 1.',
    input_schema: {
      type: "object",
      properties: {
        from: DATE,
        to: DATE,
        include_closed: { type: "boolean", description: "Default true. false = open jobs only." },
      },
    },
  }, {
    name: "crew_hours",
    levels: ["foreman", "office"],
    rpc: "pb_ai_crew_hours",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? "person",
      p_group2: i.then_by ?? null,
      p_person: i.person ?? null,
    }),
    label: (i) => `crew hours by ${i.group_by ?? "person"}`,
    description:
      "Hours worked per person from signed daily reports: hours, person_days, avg_hours_per_person_day, work_days, people; grouped by person, foreman (who signed), job, type, day, week or month. Includes people not on the app. A foreman sees only his own dailies.",
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        group_by: grp(
          ["person", "foreman", "job", "type", "day", "week", "month", "all"],
          "First grouping, default person.",
        ),
        then_by: grp(
          ["person", "foreman", "job", "type", "day", "week", "month"],
          "Optional second grouping.",
        ),
        person: { type: "string", description: "Part of a name, to show one person." },
      },
    },
  }, {
    name: "equipment_usage",
    levels: ["foreman", "office"],
    rpc: "pb_ai_equipment_usage",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? "equipment",
      p_group2: i.then_by ?? null,
      p_equipment: i.equipment ?? null,
      p_rentals: i.rentals ?? !0,
    }),
    label: (i) =>
      `equipment hours by ${i.group_by ?? "equipment"}${i.equipment ? ", " + i.equipment : ""}`,
    description:
      'Machine hours from daily reports for ONE machine or all, grouped by equipment, job, foreman, day, week or month: hours, days, avg_hours_per_day, machines, rental. equipment filters by part of the name or unit number (e.g. "336", "EX-4"); matched lists the machines it found. One machine on one job on one day counts once, as the app does. Use for "how many hours did the 336 run on job X last week".',
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        equipment: {
          type: "string",
          description: 'Part of the machine name or unit number, e.g. "336".',
        },
        group_by: grp(
          ["equipment", "job", "foreman", "day", "week", "month", "all"],
          "First grouping, default equipment.",
        ),
        then_by: grp(
          ["equipment", "job", "foreman", "day", "week", "month"],
          "Optional second grouping.",
        ),
        rentals: { type: "boolean", description: "Include rentals (default true)." },
      },
    },
  }, {
    name: "inspection_stats",
    levels: ["foreman", "office"],
    rpc: "pb_ai_inspection_stats",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_group: i.group_by ?? "kind",
      p_group2: i.then_by ?? null,
    }),
    label: (i) => `inspection results by ${i.group_by ?? "kind"}`,
    description:
      'Inspection and test results grouped by kind, job, foreman, inspector_agency, day, week or month: checks, pass, fail, partial, fail_or_partial_pct, first_try_pass_pct. Use for fail rates and "whose crew fails the most tests". A foreman sees his assigned items only.',
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        group_by: grp(
          ["kind", "job", "foreman", "inspector_agency", "day", "week", "month", "all"],
          "First grouping, default kind.",
        ),
        then_by: grp(
          ["kind", "job", "foreman", "inspector_agency", "day", "week", "month"],
          "Optional second grouping.",
        ),
      },
    },
  }, {
    name: "people",
    levels: ["office"],
    rpc: "pb_ai_people",
    args: (i) => ({ p_role: i.role ?? null }),
    label: () => "company people",
    description:
      "The company's people: name, role (owner, manager, pm with title, foreman, pipelayer), whether they left, each pipelayer's current foreman, each foreman's current crew, last production date and last daily. Use it to find who is on whose crew or to match a first name before people_production.",
    input_schema: {
      type: "object",
      properties: {
        role: grp(
          ["foreman", "pipelayer", "pm", "owner", "manager"],
          "Only this role. Leave out for everyone.",
        ),
      },
    },
  }, {
    name: "materials_all_jobs",
    levels: ["office"],
    rpc: "pb_ai_materials_all",
    args: (i) => ({ p_material: i.material ?? null }),
    label: (i) => `materials, all jobs${i.material ? ", " + i.material : ""}`,
    description:
      "Materials on every job (planned, used, used_pct, ordered, delivered, status), totals per material across jobs, and each job's spoils to haul (loose yd3, loads). material filters by part of the name (spoils are listed only without a filter). For one job use materials or spoils.",
    input_schema: {
      type: "object",
      properties: {
        material: { type: "string", description: 'Part of a material name, e.g. "SDR35", "rock".' },
      },
    },
  }, {
    name: "fitting_time",
    levels: ["pipelayer", "foreman", "office"],
    rpc: "pb_ai_fitting_time",
    args: (i) => ({
      p_job: i.job ?? null,
      p_from: i.from ?? null,
      p_to: i.to ?? null,
      p_kind: i.kind ?? "all",
      p_type: i.type ?? null,
      p_size: i.pipe_size_in ?? null,
      p_foreman: i.foreman ?? null,
      p_pipelayer: i.pipelayer ?? null,
      p_by: i.by ?? null,
      p_cap_min: i.break_cap_min ?? 60,
    }),
    label: (i) =>
      `time per ${
        i.type || (i.kind === "crossing"
          ? "crossing"
          : i.kind === "fitting"
          ? "fitting"
          : "fitting and crossing")
      } vs plain pipe${i.job ? ", job " + i.job : ""}${i.by ? " by " + i.by : ""}`,
    description:
      'How much longer a fitting (wye, tee, bend, reducer, coupling) or a utility crossing takes the crew than plain pipe, from the times rows were marked laid on run reports. Each fitting / crossing is timed over the stick before + it + the stick after and compared with plain pipe from the same run (per foot, same footage), so late or batched marks are absorbed. rows: kind, type, used, extra_min_median (THE answer: extra minutes per fitting / crossing), extra_min_typical_low/high (middle half), window_min_median vs plain_pipe_min_same_ft_median, small_sample (used under 5), found and how many were left out and why (break, swiped_together, session_start, next_to_another, not_laid_through_yet). "(all fittings)" / "(all crossings)" rows pool every type; a "combined" row is a fitting and crossing so close together they are timed as one. baseline: plain pipe min_per_stick, stick_ft, plain_pipe_sticks, typical range. by: foreman / pipelayer / job / pipe_size breakdown (office: all; foreman: pipelayer, job, size; pipelayer: job, size). Crossings are grouped by utility (Water, Gas, Sewer...).',
    input_schema: {
      type: "object",
      properties: {
        job: JOB,
        from: DATE,
        to: DATE,
        kind: grp(
          ["all", "fitting", "crossing"],
          "Fittings, utility crossings, or both (default all).",
        ),
        type: {
          type: "string",
          description:
            "One fitting type (wye, tee, bend, reducer, coupling, other; a 45 or 90 elbow is a bend) or a crossing utility (water, gas, sewer, storm drain, electric...). Leave out for every type.",
        },
        pipe_size_in: {
          type: "number",
          description: "Only runs of this pipe size, inches (e.g. 8).",
        },
        foreman: {
          type: "string",
          description: "Office only: part of a foreman's name, to show only his crew.",
        },
        pipelayer: {
          type: "string",
          description: "Office or foreman: part of a pipelayer's name.",
        },
        by: grp(
          ["foreman", "pipelayer", "job", "pipe_size"],
          "Optional breakdown, e.g. which crew is quickest on wyes.",
        ),
        break_cap_min: {
          type: "number",
          description:
            "A gap over this many minutes inside a window counts as a break and is left out. Default 60; change only if the person asks.",
        },
      },
    },
  }, {
    name: "my_runs",
    levels: ["individual"],
    rpc: "pb_ai_my_runs",
    args: (i) => ({ p_from: i.from ?? null, p_to: i.to ?? null }),
    label: () => "your saved runs",
    description: "Your own runs saved to your account (individual plan).",
    input_schema: { type: "object", properties: { from: DATE, to: DATE } },
  }];
// plan_read: the sheet's index (as the person asking: access is checked by the server) + up to 4 tile images
async function planRead(input, cx) {
  const page = Math.trunc(Number(input.page));
  if (!input.job || !Number.isFinite(page) || page < 1) return { text: "plan_read needs the job and a page number.", isError: !0 };
  const { data, error } = await cx.userRpc("pb_ai_plan_sheet", { p_job: String(input.job).slice(0, 60), p_page: page, p_set_title: input.set ? String(input.set).slice(0, 200) : null });
  if (error) return { text: "The app's server could not open that sheet. Do not guess plan values.", isError: !0 };
  if (!data || data.ok === !1) return { text: `Not available: ${cleanUntrusted(data?.message || "no such sheet", 200)}`, isError: !1 };
  const grid = Array.isArray(data.grid?.tiles) ? data.grid.tiles : [];
  const want = (Array.isArray(input.tiles) ? input.tiles : []).map((t) => String(t).trim().toLowerCase()).filter((t) => grid.includes(t)).slice(0, 4);
  const ref = cx.nextRef();
  const lbl = `plan sheet ${cleanUntrusted(String(data.sheet || page), 40)} (page ${page}${want.length ? ", tiles " + want.join(",") : ""})`;
  cx.sources.push({ n: "D" + ref, kind: "data", title: lbl, tool: "plan_read", input });
  const read = JSON.parse(JSON.stringify(data.read || {}, (_k, v) => typeof v == "string" ? cleanUntrusted(v, 1500) : v));
  let idx = JSON.stringify({ set: data.set, page, sheet: data.sheet, sheet_title: data.sheet_title, state: data.state, tiles: grid, read });
  idx.length > cx.resultChars * 2 && (idx = shrink({ set: data.set, page, sheet: data.sheet, tiles: grid, read }, cx.resultChars * 2));
  const text = `<data ref="D${ref}">\n[D${ref}] ${lbl}: ${idx}\n</data>`;
  const content = [{ type: "text", text }];
  let shown = 0;
  for (const t of want) {
    try {
      const { data: blob, error: e } = await cx.admin.storage.from("plan-sets").download(`${data.set_id}/p${page}/${t}.jpg`);
      if (e || !blob) continue;
      const u8 = new Uint8Array(await blob.arrayBuffer());
      let b = "";
      for (let i = 0; i < u8.length; i += 32768) b += String.fromCharCode(...u8.subarray(i, i + 32768));
      content.push({ type: "text", text: `TILE ${t} of page ${page}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: btoa(b) } });
      shown++;
    } catch { /* tile missing: the index still answers */ }
  }
  shown && (cx.planImages = !0);
  want.length && !shown && content.push({ type: "text", text: "The tile images could not be loaded; use the index and say the drawing wasn't re-checked." });
  return { text, content, isError: !1 };
}
function toolsFor(level, codeExec) {
  const list = DEFS.filter((d) => d.levels.includes(level)).map((d) => {
    const t = { name: d.name, description: d.description, input_schema: d.input_schema };
    return codeExec && d.rpc && (t.allowed_callers = ["direct", CODE_EXEC_TYPE]), t;
  });
  return codeExec && list.push({ type: CODE_EXEC_TYPE, name: "code_execution" }), list;
}
const PROP_UNITS = /^(LF|EA|yd3|CY|ton|tons|SF|SY|LS|gal|lb|ft|in)$/i;
function checkProposal(input, calcValues) {
  const job = cleanUntrusted(String(input?.job ?? ""), 60).replace(/[^\p{L}\p{N} ._#\/-]+/gu, "")
    .trim();
  if (!job) return { ok: !1, why: "Name the job number." };
  const items = Array.isArray(input?.items) ? input.items : [];
  if (!items.length || items.length > 20) return { ok: !1, why: "Give 1 to 20 lines." };
  const out = [];
  for (const it of items) {
    const name = cleanUntrusted(String(it?.name ?? ""), 60).replace(/\s+/g, " ").trim(),
      kind = ["pipe", "fittings", "structures", "concrete", "asphalt", "base", "other"].includes(
          it?.kind,
        )
        ? it.kind
        : "other",
      qty = Number(it?.qty),
      unit = String(it?.unit ?? "").trim(),
      basis = cleanUntrusted(String(it?.basis ?? ""), 200).replace(/\s+/g, " ").trim();
    if (!name) return { ok: !1, why: "Every line needs a name." };
    if (!(qty > 0 && qty <= 1e8)) return { ok: !1, why: `${name}: the amount must be above 0.` };
    if (!PROP_UNITS.test(unit)) {
      return { ok: !1, why: `${name}: use a unit like LF, EA, yd3, ton or SF.` };
    }
    if (
      kind === "pipe" && !/^LF$/i.test(unit) || kind === "concrete" && !/^(yd3|CY)$/i.test(unit) ||
      kind === "asphalt" && !/^tons?$/i.test(unit)
    ) {
      return {
        ok: !1,
        why: `${name}: ${kind} goes in ${
          kind === "pipe" ? "LF" : kind === "concrete" ? "yd3" : "tons"
        }.`,
      };
    }
    if (
      !calcValues.some((v) =>
        Math.abs(v - qty) <= Math.max(.005, Math.abs(v) * 1e-9) ||
        Math.abs(Math.round(v * 100) / 100 - qty) < 1e-9
      )
    ) return { ok: !1, why: `${name}: ${qty} is not a calc result. Work it out with calc first.` };
    out.push({ name, kind, qty: Math.round(qty * 1e3) / 1e3, unit, basis });
  }
  return { ok: !0, p: { job, items: out } };
}
async function runTool(name, input, cx) {
  const def = DEFS.find((d) => d.name === name);
  if (!def || !def.levels.includes(cx.level)) {
    return { text: `Tool ${name} is not available for this account.`, isError: !0 };
  }
  try {
    if (name === "calc") {
      const r = calc(input?.expression);
      return r.ok
        ? (cx.calcValues?.push(...(r.values || [r.value])), { text: `calc: ${r.text}`, isError: !1 })
        : { text: `calc error: ${r.error}`, isError: !0 };
    }
    if (name === "propose_materials") {
      const c = checkProposal(input, cx.calcValues || []);
      return c.ok
        ? (cx.proposal?.(c.p), {
          text: `Shown to the person as a card for job ${c.p.job} (${c.p.items.length} line${
            c.p.items.length === 1 ? "" : "s"
          }). Nothing is saved until they save each line in the job's Materials. Say that in one line; do not list the lines again.`,
          isError: !1,
        })
        : { text: `Not shown: ${c.why}`, isError: !0 };
    }
    if (name === "plan_read") return await planRead(input || {}, cx);
    if (name === "search_knowledge") {
      const q = String(input?.query || "").slice(0, 300),
        lib = String(input?.library || "any"),
        out = [];
      if (lib !== "documents" && cx.kb) {
        // ask_state: the same state rule as the first search (a state's chunk only on that state's job, or when the
        // search or the question names the state); general and federal chunks always
        const stCode = cx.state?.code || null, stNamed = [...(cx.state?.named || []), ...questionStates(q)];
        // ask_shelf: the deep library too (this job's state + federal). Its excerpts take up to 2 of the same 5 places
        // and the same 7,000 characters; they are listed after the core ones.
        const shelf = lib === "app" || !cx.shelfSearch ? [] : (await cx.shelfSearch(q, { ...SHELF_TOOL, coll: lib === "osha" ? ["osha"] : null })).slice(0, SHELF_TOOL.k);
        let kbChars = shelf.reduce((a, h) => a + h.text.length, 0), kbN = shelf.length;
        for (
          const h of search(cx.kb, q, {
            k: 20,
            level: cx.level,
            lib: lib === "any" ? "" : lib,
            maxChars: 28e3,
          })
        ) {
          if (!keepForState(h, stCode, stNamed) || tenStatesOnly(h, stCode, q)) continue;
          if (kbN >= 5 || (kbChars + h.text.length > 7e3 && kbN)) break;
          kbN++, kbChars += h.text.length;
          const n = cx.nextExcerpt();
          cx.sources.push({
            n,
            kind: "kb",
            title: h.title,
            lib: h.lib,
            source: h.source,
            url: h.url,
            verbatim: h.verbatim,
            id: h.id,
            _text: h.text,
          }),
            out.push(
              `[${n}] (${
                h.verbatim ? "OSHA VERBATIM: " + h.source : h.lib + " library: " + h.source
              }) ${h.title}: ${h.text.slice(0, 1800)}`,
            );
        }
        for (const h of shelf) {
          const n = cx.nextExcerpt();
          cx.sources.push({ n, kind: "kb", title: h.title, lib: h.lib, source: h.source, url: h.url, verbatim: h.verbatim, id: h.id, _text: h.text }),
            out.push(`[${n}] (${h.verbatim ? "OSHA VERBATIM: " + h.source : h.lib + " library: " + h.source}) ${h.title}: ${h.text}`);
        }
      }
      if (lib === "any" || lib === "documents") {
        for (const d of (await cx.docsSearch(q)).slice(0, 3)) {
          const n = cx.nextExcerpt();
          cx.sources.push({ ...docSource(n, d), _text: cleanUntrusted(d.text, 1600) }),
            out.push(docBlock(n, docHeader(d), docTitle(d), d.text));
        }
      }
      return {
        text: out.length
          ? out.join(`
`)
          : "No matching excerpts.",
        isError: !1,
      };
    }
    const { data, error } = await cx.userRpc(def.rpc, def.args(input || {}));
    if (error) {
      const code = String(error.message || "").match(/\bpb:[a-z_]+\b/);
      return {
        text: `The app's server could not read that${
          code ? " (" + code[0] + ")" : ""
        }. Do not guess the numbers.`,
        isError: !0,
      };
    }
    if (data && data.ok === !1) {
      return {
        text: `Not available: ${cleanUntrusted(data.message || data.code, 200)}`,
        isError: !1,
      };
    }
    const ref = cx.nextRef(),
      lbl = String(def.label ? def.label(input || {}) : name).replace(
        /[^\p{L}\p{N} .,+\/#()'-]+/gu,
        " ",
      ).replace(/\s+/g, " ").trim().slice(0, 80) || name;
    cx.sources.push({ n: "D" + ref, kind: "data", title: lbl, tool: name, input });
    const clean = JSON.parse(
      JSON.stringify(data, (_k, v) => typeof v == "string" ? cleanUntrusted(v, 400) : v),
    );
    let s = JSON.stringify(clean);
    return s.length > cx.resultChars && (s = shrink(clean, cx.resultChars)), {
      text: `<data ref="D${ref}">
[D${ref}] ${lbl}: ${s}
</data>`,
      isError: !1,
    };
  } catch {
    return { text: "Tool failed. Do not guess the numbers.", isError: !0 };
  }
}
function shrink(data, max) {
  const d = JSON.parse(JSON.stringify(data));
  for (const k of Object.keys(d)) {
    if (Array.isArray(d[k]) && d[k].length > 20) {
      const n = d[k].length;
      d[k] = d[k].slice(0, 20), d[k + "_left_out"] = n - 20;
    }
  }
  let s = JSON.stringify(d);
  return s.length > max &&
    (s = s.slice(0, max) +
      " ...(cut: ask for a narrower date range, one job, or a coarser grouping)"),
    s;
}
function docSource(n, d) {
  return {
    n,
    kind: "doc",
    title: cleanUntrusted(d.doc_title, 200),
    section: cleanUntrusted(d.section, 300),
    label: d.label,
    scope: d.scope,
    publisher: cleanUntrusted(d.publisher, 160),
    doc_number: cleanUntrusted(d.doc_number, 80),
    doc_date: d.doc_date,
    area: cleanUntrusted(d.area, 200),
    official: !!d.official,
    conflict: !!d.conflict,
    pages: d.pages,
    doc: d.doc,
  };
}
function docTitle(d) {
  return `${d.doc_title || "Document"}${d.section ? " / " + d.section : ""}${
    d.pages ? " (p. " + d.pages + ")" : ""
  }`;
}
function docHeader(d) {
  return [
    d.label === "Added by a user" ? "USER-ADDED document" : String(d.label || "document"),
    d.publisher,
    d.doc_number,
    d.doc_date ? "dated " + d.doc_date : "undated",
    d.area ? "area " + d.area : "",
    d.official
      ? "checked against the publisher's own copy"
      : "not checked against an official source",
    d.conflict ? "CONFLICTS with another shared document" : "",
  ].filter(Boolean).join("; ");
}
export { checkProposal, CODE_EXEC_TYPE, DEFS, docHeader, docSource, docTitle, runTool, toolsFor };
