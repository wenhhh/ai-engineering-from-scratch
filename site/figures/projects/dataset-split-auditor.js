(function () {
  "use strict";
  // 由 Python 3.14 str.casefold()、Unicode 16.0.0 生成；本批保留原始映射表。
  // 范围编码为 [first, last, stride, delta]；例外表包含完整折叠。
  const foldRanges = [[65,90,1,32],[192,214,1,32],[216,222,1,32],[256,302,2,1],[306,310,2,1],[313,327,2,1],[330,374,2,1],[377,381,2,1],[416,420,2,1],[459,475,2,1],[478,494,2,1],[504,542,2,1],[546,562,2,1],[582,590,2,1],[904,906,1,37],[913,929,1,32],[931,939,1,32],[984,1006,2,1],[1021,1023,1,-130],[1024,1039,1,80],[1040,1071,1,32],[1120,1152,2,1],[1162,1214,2,1],[1217,1229,2,1],[1232,1326,2,1],[1329,1366,1,48],[4256,4293,1,7264],[5112,5117,1,-8],[7312,7354,1,-3008],[7357,7359,1,-3008],[7680,7828,2,1],[7840,7934,2,1],[7944,7951,1,-8],[7960,7965,1,-8],[7976,7983,1,-8],[7992,7999,1,-8],[8008,8013,1,-8],[8025,8031,2,-8],[8040,8047,1,-8],[8136,8139,1,-86],[8544,8559,1,16],[9398,9423,1,26],[11264,11311,1,48],[11367,11371,2,1],[11392,11490,2,1],[42560,42604,2,1],[42624,42650,2,1],[42786,42798,2,1],[42802,42862,2,1],[42878,42886,2,1],[42902,42920,2,1],[42932,42946,2,1],[42966,42970,2,1],[43888,43967,1,-38864],[65313,65338,1,32],[66560,66599,1,40],[66736,66771,1,40],[66928,66938,1,39],[66940,66954,1,39],[66956,66962,1,39],[68736,68786,1,64],[68944,68965,1,32],[71840,71871,1,32],[93760,93791,1,32],[125184,125217,1,34]];
  const foldExceptions = {"181":"μ","223":"ss","304":"i̇","329":"ʼn","376":"ÿ","383":"s","385":"ɓ","386":"ƃ","388":"ƅ","390":"ɔ","391":"ƈ","393":"ɖ","394":"ɗ","395":"ƌ","398":"ǝ","399":"ə","400":"ɛ","401":"ƒ","403":"ɠ","404":"ɣ","406":"ɩ","407":"ɨ","408":"ƙ","412":"ɯ","413":"ɲ","415":"ɵ","422":"ʀ","423":"ƨ","425":"ʃ","428":"ƭ","430":"ʈ","431":"ư","433":"ʊ","434":"ʋ","435":"ƴ","437":"ƶ","439":"ʒ","440":"ƹ","444":"ƽ","452":"ǆ","453":"ǆ","455":"ǉ","456":"ǉ","458":"ǌ","496":"ǰ","497":"ǳ","498":"ǳ","500":"ǵ","502":"ƕ","503":"ƿ","544":"ƞ","570":"ⱥ","571":"ȼ","573":"ƚ","574":"ⱦ","577":"ɂ","579":"ƀ","580":"ʉ","581":"ʌ","837":"ι","880":"ͱ","882":"ͳ","886":"ͷ","895":"ϳ","902":"ά","908":"ό","910":"ύ","911":"ώ","912":"ΐ","944":"ΰ","962":"σ","975":"ϗ","976":"β","977":"θ","981":"φ","982":"π","1008":"κ","1009":"ρ","1012":"θ","1013":"ε","1015":"ϸ","1017":"ϲ","1018":"ϻ","1216":"ӏ","1415":"եւ","4295":"ⴧ","4301":"ⴭ","7296":"в","7297":"д","7298":"о","7299":"с","7300":"т","7301":"т","7302":"ъ","7303":"ѣ","7304":"ꙋ","7305":"ᲊ","7830":"ẖ","7831":"ẗ","7832":"ẘ","7833":"ẙ","7834":"aʾ","7835":"ṡ","7838":"ss","8016":"ὐ","8018":"ὒ","8020":"ὔ","8022":"ὖ","8064":"ἀι","8065":"ἁι","8066":"ἂι","8067":"ἃι","8068":"ἄι","8069":"ἅι","8070":"ἆι","8071":"ἇι","8072":"ἀι","8073":"ἁι","8074":"ἂι","8075":"ἃι","8076":"ἄι","8077":"ἅι","8078":"ἆι","8079":"ἇι","8080":"ἠι","8081":"ἡι","8082":"ἢι","8083":"ἣι","8084":"ἤι","8085":"ἥι","8086":"ἦι","8087":"ἧι","8088":"ἠι","8089":"ἡι","8090":"ἢι","8091":"ἣι","8092":"ἤι","8093":"ἥι","8094":"ἦι","8095":"ἧι","8096":"ὠι","8097":"ὡι","8098":"ὢι","8099":"ὣι","8100":"ὤι","8101":"ὥι","8102":"ὦι","8103":"ὧι","8104":"ὠι","8105":"ὡι","8106":"ὢι","8107":"ὣι","8108":"ὤι","8109":"ὥι","8110":"ὦι","8111":"ὧι","8114":"ὰι","8115":"αι","8116":"άι","8118":"ᾶ","8119":"ᾶι","8120":"ᾰ","8121":"ᾱ","8122":"ὰ","8123":"ά","8124":"αι","8126":"ι","8130":"ὴι","8131":"ηι","8132":"ήι","8134":"ῆ","8135":"ῆι","8140":"ηι","8146":"ῒ","8147":"ΐ","8150":"ῖ","8151":"ῗ","8152":"ῐ","8153":"ῑ","8154":"ὶ","8155":"ί","8162":"ῢ","8163":"ΰ","8164":"ῤ","8166":"ῦ","8167":"ῧ","8168":"ῠ","8169":"ῡ","8170":"ὺ","8171":"ύ","8172":"ῥ","8178":"ὼι","8179":"ωι","8180":"ώι","8182":"ῶ","8183":"ῶι","8184":"ὸ","8185":"ό","8186":"ὼ","8187":"ώ","8188":"ωι","8486":"ω","8490":"k","8491":"å","8498":"ⅎ","8579":"ↄ","11360":"ⱡ","11362":"ɫ","11363":"ᵽ","11364":"ɽ","11373":"ɑ","11374":"ɱ","11375":"ɐ","11376":"ɒ","11378":"ⱳ","11381":"ⱶ","11390":"ȿ","11391":"ɀ","11499":"ⳬ","11501":"ⳮ","11506":"ⳳ","42873":"ꝺ","42875":"ꝼ","42877":"ᵹ","42891":"ꞌ","42893":"ɥ","42896":"ꞑ","42898":"ꞓ","42922":"ɦ","42923":"ɜ","42924":"ɡ","42925":"ɬ","42926":"ɪ","42928":"ʞ","42929":"ʇ","42930":"ʝ","42931":"ꭓ","42948":"ꞔ","42949":"ʂ","42950":"ᶎ","42951":"ꟈ","42953":"ꟊ","42955":"ɤ","42956":"ꟍ","42960":"ꟑ","42972":"ƛ","42997":"ꟶ","64256":"ff","64257":"fi","64258":"fl","64259":"ffi","64260":"ffl","64261":"st","64262":"st","64275":"մն","64276":"մե","64277":"մի","64278":"վն","64279":"մխ","66964":"𐖻","66965":"𐖼"};

  function casefold(text) {
    return Array.from(text, character => {
      const point = character.codePointAt(0);
      if (Object.prototype.hasOwnProperty.call(foldExceptions, point)) return foldExceptions[point];
      const range = foldRanges.find(entry => point >= entry[0] && point <= entry[1] && (point - entry[0]) % entry[2] === 0);
      return range ? String.fromCodePoint(point + range[3]) : character;
    }).join("");
  }
  function textStages(text) {
    if (typeof text !== "string") throw new Error("文本必须是字符串（Text must be a string.）。");
    if (Array.from(text).some(c => c.codePointAt(0) >= 0xd800 && c.codePointAt(0) <= 0xdfff)) {
      throw new Error("未配对代理项无法编码为 Python UTF-8 文本（An unpaired surrogate cannot be encoded as Python UTF-8 text.）。");
    }
    const nfkc = text.normalize("NFKC"), folded = casefold(nfkc);
    // Python split 包括 U+001C..U+001F 和 U+0085，不包括 U+FEFF。
    const normalized = folded.replace(/[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu, " ").replace(/^ | $/g, "");
    return { raw: text, nfkc, folded, normalized };
  }
  async function sha256(text) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("SHA-256 requires Web Crypto. SHA-256 需要 Web Crypto，请通过 HTTPS 或 localhost 打开此页面。");
    }
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  async function fingerprint(record) {
    const stages = textStages(record.text);
    return { ...record, ...stages, fingerprint: await sha256(stages.normalized) };
  }
  function sorted(values) {
    return Array.from(values).sort((left, right) => {
      const a = Array.from(left, c => c.codePointAt(0)), b = Array.from(right, c => c.codePointAt(0));
      for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
        if (a[i] !== b[i]) return a[i] - b[i];
      }
      return a.length - b.length;
    });
  }
  function validate(records) {
    const seen = new Set();
    records.forEach(record => {
      if (!["id", "group", "text"].every(key => typeof record[key] === "string" && record[key].length > 0)) {
        throw new Error("每条可见记录的 id、group 和 text 均须非空（Each visible record needs a nonempty id, group and text.）。");
      }
      if (seen.has(record.id)) {
        throw new Error("重复记录 ID（Duplicate record id " + JSON.stringify(record.id) + "）。审计前请为每一行分配独立标识。");
      }
      seen.add(record.id);
    });
  }
  function rowItem(record, value, detail, tone = "neutral") {
    return { id: "record:" + record.id, label: record.id, value, detail, tone };
  }
  function rawItem(record) {
    return rowItem(record, JSON.stringify(record.text), "组别：" + JSON.stringify(record.group));
  }
  function partitions(train, test, render = rawItem) {
    return [{ id: "train", label: "训练集", items: train.map(render) }, { id: "test", label: "测试集", items: test.map(render) }];
  }
  async function inspect(train, test) {
    validate(train.concat(test));
    const trainDetails = await Promise.all(train.map(fingerprint)), testDetails = await Promise.all(test.map(fingerprint));
    function intersections(key) {
      const trainKeys = new Set(trainDetails.map(record => record[key])), testKeys = new Set(testDetails.map(record => record[key]));
      return sorted(Array.from(trainKeys).filter(value => testKeys.has(value)));
    }
    const content = intersections("fingerprint"), groups = intersections("group");
    function evidence(values, key) {
      return values.map(value => ({
        value,
        train_ids: trainDetails.filter(record => record[key] === value).map(record => record.id),
        test_ids: testDetails.filter(record => record[key] === value).map(record => record.id),
      }));
    }
    return {
      train: trainDetails, test: testDetails,
      audit: { content_leaks: content, group_leaks: groups, clean: content.length === 0 && groups.length === 0 },
      contentEvidence: evidence(content, "fingerprint"), groupEvidence: evidence(groups, "group"),
    };
  }
  function auditView(details) {
    const links = [];
    [["contentEvidence", "规范化内容相同"], ["groupEvidence", "原始组别相同"]].forEach(([kind, label]) => {
      details[kind].forEach(entry => entry.train_ids.forEach(trainId => entry.test_ids.forEach(testId => {
        links.push({ from: "record:" + trainId, to: "record:" + testId, label, tone: "bad" });
      })));
    });
    return {
      lanes: partitions(details.train, details.test, record => {
        const content = details.audit.content_leaks.includes(record.fingerprint), group = details.audit.group_leaks.includes(record.group);
        return rowItem(record, JSON.stringify(record.text),
          "组别：" + JSON.stringify(record.group) + ". " + (content ? "内容重叠。" : "") + (group ? "组别重叠。" : ""),
          content || group ? "bad" : "good");
      }),
      links,
      metrics: [
        { label: "共有指纹", value: details.audit.content_leaks.length },
        { label: "共有组别", value: details.audit.group_leaks.length },
        { label: "审计无泄漏", value: details.audit.clean },
      ],
      columns: ["证据", "准确的键", "训练记录 ID", "测试记录 ID"],
      rows: details.contentEvidence.map(entry => ["内容", entry.value, entry.train_ids.join(", "), entry.test_ids.join(", ")])
        .concat(details.groupEvidence.map(entry => ["组别", JSON.stringify(entry.value), entry.train_ids.join(", "), entry.test_ids.join(", ")])),
    };
  }
  const field = (key, label, value) => ({ key, label, type: "text", value });
  const count = (key, label, value, max) => ({ key, label, type: "range", value, min: 0, max, step: 1 });
  function rowCount(value) {
    if (!Number.isInteger(value) || value < 0 || value > 12) throw new Error("行数必须为 0 到 12 的整数（Row counts must be whole numbers between zero and twelve.）。");
    return value;
  }

  window.AIFSProjectFigures.register("pj-dataset-split-auditor-1", {
    title: "观察两条记录如何变成指纹",
    caption: "跟踪实际文本依次经过规范化、Unicode 大小写折叠、空白合并和 SHA-256。",
    lab: {
      question: "这两个不同的文本字符串会生成相同内容指纹吗？",
      controls: [field("textA", "记录 A 文本", "  Straße\t"), field("textB", "记录 B 文本", "STRASSE")],
      scenarios: [
        { label: "德语大小写折叠", values: { textA: "  Straße\t", textB: "STRASSE" } },
        { label: "希腊字母 sigma", values: { textA: "ΟΣ", textB: "ος" } },
        { label: "兼容形式", values: { textA: "Ａ  ﬃ", textB: "a ffi" } },
        { label: "不同含义", values: { textA: "rollout passed", textB: "rollout failed" } },
      ],
      calculate: async values => {
        const records = await Promise.all([fingerprint({ id: "record-a", text: values.textA }), fingerprint({ id: "record-b", text: values.textB })]);
        records.forEach(record => {
          record.utf8 = Array.from(new TextEncoder().encode(record.normalized), byte => byte.toString(16).padStart(2, "0")).join(" ");
        });
        const operations = [
          ["原始文本", "raw", "从两个独立记录 ID 开始；引号让空格和控制字符可见。"],
          ["规范化兼容形式", "nfkc", "比较内容前，NFKC 先替换全角字母等 Unicode 兼容形式。"],
          ["执行 Unicode 大小写折叠", "folded", "Python casefold 可能展开字符：ß 变成 ss，两种希腊字母 sigma 都变成 σ。"],
          ["合并空白", "normalized", "Python 的 split/join 将连续空白合为一个空格，并去掉首尾空白。"],
          ["编码为 UTF-8", "utf8", "对这些实际 UTF-8 字节计算哈希。字节值以十六进制显示；相同字节序列得到相同摘要。"],
          ["计算 SHA-256", "fingerprint", "下方完整 SHA-256 摘要由 Web Crypto 对规范化后的 UTF-8 字节实际计算。"],
        ];
        const frames = operations.map(([label, key, explanation], index) => ({
          label, explanation,
          lanes: [{ id: "records", label, items: records.map(record => rowItem(record,
            index < 4 ? JSON.stringify(record[key]) : record[key] || "（零字节）",
            "记录标识保持为 " + record.id, index === 5 ? "good" : "active")) }],
        }));
        const same = records[0].fingerprint === records[1].fingerprint;
        Object.assign(frames.at(-1), {
          summary: same ? "两个记录标识对应同一个内容指纹。" : "两条记录的内容指纹不同。",
          metrics: [{ label: "规范化内容相同", value: same }],
          formula: "SHA-256(UTF-8(collapse_whitespace(casefold(NFKC(text)))))",
          receipt: { records },
        });
        return { frames };
      },
    },
  });

  window.AIFSProjectFigures.register("pj-dataset-split-auditor-2", {
    title: "找出重叠背后的记录",
    caption: "内容相等与组别相等分别检查，每条连线都标明涉及的两条记录。",
    lab: {
      question: "这些分区共享规范化内容、组标识、两者都有，还是都没有？",
      controls: [
        field("trainId", "训练记录 ID", "train-a"), field("trainGroup", "训练组别", "incident-A"),
        field("trainText", "训练文本", "Timeout after rollout"), field("testId", "测试记录 ID", "test-b"),
        field("testGroup", "测试组别", "incident-B"), field("testText", "测试文本", " timeout AFTER rollout "),
      ],
      scenarios: [
        { label: "仅内容重叠", values: {} },
        { label: "仅组别重叠", values: { testGroup: "incident-A", testText: "Cache warmed" } },
        { label: "两者重叠", values: { testGroup: "incident-A" } },
        { label: "无泄漏", values: { testText: "Cache warmed" } },
        { label: "重复 ID", values: { testId: "train-a" } },
      ],
      calculate: async values => {
        const train = [{ id: values.trainId, group: values.trainGroup, text: values.trainText }];
        const test = [{ id: values.testId, group: values.testGroup, text: values.testText }];
        const details = await inspect(train, test);
        return { frames: [
          {
            label: "校验记录标识",
            explanation: "两条记录的 ID、组别和文本均非空，ID 在合并后的训练与测试数组中也保持唯一。",
            lanes: partitions(train, test), metrics: [{ label: "已校验记录 ID", value: train.length + test.length }],
          },
          {
            label: "为规范化内容建立索引",
            explanation: "每个分区都为完整 SHA-256 指纹建立索引。即使内容键相同，记录 ID 也保持独立。",
            lanes: partitions(details.train, details.test, record => rowItem(record, record.fingerprint, "规范化文本：" + JSON.stringify(record.normalized), "active")),
            columns: ["分区", "记录 ID", "规范化文本", "内容键"],
            rows: details.train.map(record => ["train", record.id, record.normalized, record.fingerprint])
              .concat(details.test.map(record => ["test", record.id, record.normalized, record.fingerprint])),
          },
          {
            label: "为原始组别建立索引",
            explanation: "组键使用原始字符串。与文本指纹不同，组 ID 从不进行大小写折叠或首尾空白移除。",
            lanes: partitions(details.train, details.test, record => rowItem(record, JSON.stringify(record.group), "记录的组归属：" + record.id, "active")),
          },
          {
            label: "对两份索引求交集",
            explanation: "只有同时出现在两个分区的键才构成泄漏，沿连线检查对应记录。",
            summary: details.audit.clean ? "两种交集均为空。" : "共有键指向需要检查的记录。",
            ...auditView(details),
            receipt: { audit: details.audit, content_evidence: details.contentEvidence, group_evidence: details.groupEvidence },
          },
        ] };
      },
    },
  });

  function groupRecords(values) {
    const rows = [];
    [["incident-A", "A", rowCount(values.groupASize)], ["incident-B", "B", rowCount(values.groupBSize)]].forEach(([group, prefix, size]) => {
      for (let index = 1; index <= size; index += 1) {
        rows.push({ id: prefix + "-" + String(index).padStart(2, "0"), group, text: "Message " + index + " from " + group });
      }
    });
    return values.reverseRows ? rows.reverse() : rows;
  }
  function groupItem(group, detail, value = group.records.length + " records", tone = "neutral") {
    return {
      id: "group:" + group.id, label: group.id, value,
      detail: "成员：" + group.records.map(record => record.id).join(", ") + ". " + detail, tone,
    };
  }

  window.AIFSProjectFigures.register("pj-dataset-split-auditor-3", {
    title: "将完整组移入分区",
    caption: "稳定哈希为每组选择分区；组大小改变最终行数比例，不改变其哈希桶值。",
    lab: {
      question: "每个事件组将进入哪一侧？行数比例为何可能与请求的阈值不同？",
      controls: [
        field("seed", "划分种子", "course"),
        { key: "testFraction", label: "请求的测试阈值", type: "range", value: 0.5, min: 0.01, max: 0.99, step: 0.01 },
        count("groupASize", "incident-A 行数", 9, 12), count("groupBSize", "incident-B 行数", 1, 12),
        { key: "reverseRows", label: "反转输入行序", type: "checkbox", value: false },
      ],
      scenarios: [
        { label: "九行加一行", values: {} }, { label: "修改种子", values: { seed: "experiment-1" } },
        { label: "组大小相同", values: { groupASize: 5, groupBSize: 5 } },
        { label: "反转行序", values: { reverseRows: true } }, { label: "没有记录", values: { groupASize: 0, groupBSize: 0 } },
      ],
      calculate: async values => {
        if (typeof values.seed !== "string") throw new Error("种子必须为文本（Seed must be text.）。");
        if (!Number.isFinite(values.testFraction) || values.testFraction <= 0 || values.testFraction >= 1) {
          throw new Error("测试比例必须严格位于 0 和 1 之间（Test fraction must be strictly between zero and one.）。");
        }
        textStages(values.seed);
        const rows = groupRecords(values);
        validate(rows);
        const groups = await Promise.all(sorted(new Set(rows.map(record => record.group))).map(async id => {
          const key = values.seed + "\u0000" + id, digest = await sha256(key);
          const bucket = Number(BigInt("0x" + digest)) / (2 ** 256);
          return { id, records: rows.filter(record => record.group === id), key, digest, bucket, partition: bucket < values.testFraction ? "test" : "train" };
        }));
        const frames = [
          {
            label: "读取输入行",
            explanation: "这些是实际的合成测试记录。行序可以变化，但每个 ID 与组归属始终一起传递。",
            lanes: [{ id: "input", label: "输入行", items: rows.map(rawItem) }], metrics: [{ label: "输入记录", value: rows.length }],
          },
          {
            label: "收集完整组",
            explanation: "收集同一事件键下的所有记录 ID，划分会为每个完整组作出一次决定。",
            lanes: [{ id: "pending", label: "等待决定的组", items: groups.map(group => groupItem(group, "")) }],
            metrics: [{ label: "不同组数", value: groups.length }],
          },
          {
            label: "对种子、NUL 和组计算哈希",
            explanation: "分隔符是实际的 NUL 字节，下方以转义形式显示。将完整摘要解释为整数，再除以 2^256。",
            formula: 'bucket = int(SHA-256(UTF-8(seed + "\\u0000" + group)), 16) / 2^256',
            lanes: [{ id: "pending", label: "稳定组桶值", items: groups.map(group => groupItem(group, "SHA-256: " + group.digest, String(group.bucket), "active")) }],
            columns: ["组别", "准确哈希输入", "完整 SHA-256", "桶值"],
            rows: groups.map(group => [group.id, JSON.stringify(group.key), group.digest, group.bucket]),
          },
          {
            label: "与阈值比较",
            explanation: "只有桶值严格小于请求阈值时，整组才进入测试集；相等时进入训练集。",
            formula: "进入 test 的条件：bucket < " + values.testFraction + "；否则进入 train",
            lanes: [{ id: "pending", label: "计算出的决定", items: groups.map(group => groupItem(group,
              group.bucket + " < " + values.testFraction + " is " + (group.bucket < values.testFraction), group.partition, "active")) }],
          },
        ];
        groups.forEach((movedGroup, movedIndex) => {
          const assigned = groups.slice(0, movedIndex + 1);
          frames.push({
            label: "移动 " + movedGroup.id,
            explanation: movedGroup.records.length + " 条记录一起进入 " + movedGroup.partition + "。不会为了强行平衡数量而单独移动某行。",
            lanes: ["pending", "train", "test"].map(partition => {
              const members = partition === "pending" ? groups.slice(movedIndex + 1) : assigned.filter(group => group.partition === partition);
              return {
                id: partition, label: partition === "pending" ? "尚未移动" : partition === "train" ? "训练集" : "测试集",
                items: members.map(group => groupItem(group, "桶值：" + group.bucket, undefined, group.id === movedGroup.id ? "active" : "neutral")),
              };
            }),
          });
        });
        const testGroups = new Set(groups.filter(group => group.partition === "test").map(group => group.id));
        const train = rows.filter(record => !testGroups.has(record.group)), test = rows.filter(record => testGroups.has(record.group));
        const observed = rows.length ? test.length / rows.length : null;
        const trainGroups = new Set(train.map(record => record.group));
        const overlap = Array.from(testGroups).filter(group => trainGroups.has(group));
        frames.push({
          label: "统计最终行数",
          explanation: "阈值控制每组的分区决定，不能保证精确行数配额。空分区也可以是合法划分结果，必须如实报告。",
          summary: rows.length ? test.length + " / " + rows.length + " 行进入 test（" + Math.round(observed * 10000) / 100 + "%）。" : "没有提供记录，无法计算实际行数比例。",
          lanes: ["train", "test"].map(partition => ({
            id: partition, label: partition === "train" ? "训练集" : "测试集",
            items: groups.filter(group => group.partition === partition).map(group => groupItem(group, "桶值：" + group.bucket, undefined, "good")),
          })),
          metrics: [{ label: "训练行数", value: train.length }, { label: "测试行数", value: test.length }, { label: "跨分区组数", value: overlap.length }],
          bars: [{ label: "请求的测试阈值", value: values.testFraction * 100, max: 100, unit: "%" }]
            .concat(observed === null ? [] : [{ label: "实际测试行占比", value: observed * 100, max: 100, unit: "%" }]),
          receipt: {
            seed: values.seed, test_fraction: values.testFraction,
            groups: groups.map(group => ({ group: group.id, record_ids: group.records.map(record => record.id), hash_input: group.key, sha256: group.digest, bucket: group.bucket, partition: group.partition })),
            train, test, observed_test_fraction: observed,
          },
        });
        return { frames };
      },
    },
  });

  window.AIFSProjectFigures.register("pj-dataset-split-auditor-4", {
    title: "判断划分是否可用",
    caption: "统计可见记录并检查泄漏证据，要求两个分区都非空，且审计无泄漏。",
    lab: {
      question: "无泄漏的审计结果也可能对应不可用的评估划分吗？",
      controls: [
        count("trainRows", "训练记录数", 1, 5), count("testRows", "测试记录数", 1, 5),
        field("trainGroup", "训练组别", "incident-A"), field("testGroup", "测试组别", "incident-B"),
        field("trainText", "每条训练记录的文本", "Rollout completed"), field("testText", "每条测试记录的文本", "Cache warmed"),
      ],
      scenarios: [
        { label: "无泄漏且非空", values: {} }, { label: "测试集为空", values: { testRows: 0 } },
        { label: "内容泄漏", values: { testText: "ROLLOUT completed" } },
        { label: "组别泄漏", values: { testGroup: "incident-A" } }, { label: "两侧均空", values: { trainRows: 0, testRows: 0 } },
      ],
      calculate: async values => {
        const records = (partition, size, group, text) => Array.from({ length: rowCount(size) }, (_, index) => ({ id: partition + "-" + (index + 1), group, text }));
        const train = records("train", values.trainRows, values.trainGroup, values.trainText);
        const test = records("test", values.testRows, values.testGroup, values.testText);
        const details = await inspect(train, test);
        const receipt = {
          train_rows: train.length, test_rows: test.length,
          train_groups: new Set(train.map(record => record.group)).size,
          test_groups: new Set(test.map(record => record.group)).size,
          audit: details.audit, usable: train.length > 0 && test.length > 0 && details.audit.clean,
        };
        const counts = [
          { label: "训练行数", value: receipt.train_rows }, { label: "测试行数", value: receipt.test_rows },
          { label: "训练组数", value: receipt.train_groups }, { label: "测试组数", value: receipt.test_groups },
        ];
        const lanes = partitions(train, test);
        const checks = [
          { id: "check:train", label: "训练集非空", value: receipt.train_rows > 0, detail: receipt.train_rows + " > 0" },
          { id: "check:test", label: "测试集非空", value: receipt.test_rows > 0, detail: receipt.test_rows + " > 0" },
          { id: "check:audit", label: "审计无泄漏", value: details.audit.clean, detail: details.audit.content_leaks.length + " 项内容泄漏；" + details.audit.group_leaks.length + " 项组别泄漏" },
        ].map(check => ({ ...check, tone: check.value ? "good" : "bad" }));
        return { frames: [
          { label: "读取可见记录", explanation: "只有这些行进入报告，将数量设为零就会完全移除对应记录。", lanes },
          { label: "统计行数与组数", explanation: "直接统计行数，再统计每个分区中不同的原始组字符串。空分区的组数为零。", lanes, metrics: counts },
          { label: "检查跨分区证据", explanation: "仅根据可见行计算内容与组的交集，空分区不会贡献重叠项。", ...auditView(details) },
          {
            label: "要求三个条件全部成立",
            explanation: "仅仅审计无泄漏还不够：两个分区必须都有记录，且两种泄漏均不存在。",
            lanes: [{ id: "conditions", label: "必需条件", items: checks }],
            formula: "usable = (train_rows > 0) && (test_rows > 0) && audit.clean",
          },
          {
            label: "写入审计凭据",
            explanation: "这是从可见记录生成的完整报告，usable 字段取三个条件的布尔合取。",
            summary: receipt.usable ? "该划分满足三项可用性条件。" : "该划分不可用，请检查未通过的条件。",
            lanes: [{ id: "conditions", label: "必需条件", items: checks }], metrics: counts.concat([{ label: "是否可用", value: receipt.usable }]), receipt,
          },
        ] };
      },
    },
  });
})();
