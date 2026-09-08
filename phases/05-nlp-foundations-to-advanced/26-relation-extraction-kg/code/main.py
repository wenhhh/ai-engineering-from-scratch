import re
from collections import defaultdict


PATTERNS = [
    (re.compile(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?) was born in ([A-Z][A-Za-z]+)"), "P19"),
    (re.compile(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?) founded ([A-Z][A-Za-z]+(?: Inc)?)"), "P112"),
    (re.compile(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?) (?:became|is|was) CEO of ([A-Z][A-Za-z]+(?: Inc)?)"), "P169"),
    (re.compile(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?) works? (?:at|for) ([A-Z][A-Za-z]+(?: Inc)?)"), "P108"),
    (re.compile(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?) (?:studied|graduated) (?:at|from) ([A-Z][A-Za-z]+(?: University)?)"), "P69"),
    (re.compile(r"([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?) (?:acquired|bought) ([A-Z][A-Za-z]+(?: Inc)?)"), "P1830"),
]


RELATION_LABELS = {
    "P19":   "出生地（Place of birth）",
    "P112":  "创立（Founded）",
    "P169":  "担任首席执行官（CEO of）",
    "P108":  "雇主（Employer）",
    "P69":   "就读于（Educated at）",
    "P1830": "收购（Acquired）",
}


def extract(text):
    triples = []
    for pattern, rel in PATTERNS:
        for m in pattern.finditer(text):
            subj = m.group(1)
            obj = m.group(2)
            span = (m.start(), m.end())
            triples.append({"subject": subj, "relation": rel, "object": obj, "span": span, "evidence": m.group(0)})
    return triples


def verify(triples, text):
    verified = []
    for t in triples:
        s, e = t["span"]
        if text[s:e] != t["evidence"]:
            continue
        if t["subject"] not in text or t["object"] not in text:
            continue
        verified.append(t)
    return verified


def build_graph(triples):
    graph = defaultdict(list)
    for t in triples:
        graph[t["subject"]].append((t["relation"], t["object"], t["evidence"]))
    return graph


def print_graph(graph):
    for subj in sorted(graph):
        for rel, obj, ev in graph[subj]:
            label = RELATION_LABELS.get(rel, rel)
            print(f"  ({subj}) --[{label}]--> ({obj})")
            print(f"      证据（Evidence）: \"{ev}\"")


def main():
    doc = (
        "Tim Cook became CEO of Apple in 2011. "
        "Steve Jobs founded Apple in 1976. "
        "Larry Page founded Google with Sergey Brin. "
        "Sundar Pichai is CEO of Google. "
        "Satya Nadella was born in Hyderabad. "
        "Elon Musk acquired Twitter in 2022. "
        "Dario Amodei studied at Princeton University. "
        "Yann LeCun works at Meta."
    )

    print("=== 基于规则的关系抽取（Relation extraction，含来源追踪 Provenance） ===")
    print(f"文档（Document，英文语料保留以匹配抽取模式）: {doc}")
    print()

    triples = extract(doc)
    verified = verify(triples, doc)

    print(f"已抽取: {len(triples)}  已核验: {len(verified)}")
    print()
    graph = build_graph(verified)
    print_graph(graph)

    print()
    print("=== 查询（Query）：Tim Cook 的雇主 ===")
    for rel, obj, ev in graph.get("Tim Cook", []):
        if rel == "P169":
            print(f"  Tim Cook 担任 {obj} 的 CEO")
            print(f"  来源（Source）: \"{ev}\"")

    print()
    print("注意：基于规则的关系抽取（RE）= 高精确率（Precision）、低召回率（Recall）。")
    print("生产技术栈将模式（Patterns）+ REBEL + 大语言模型（LLM）结合，并使用 AEVS 核验。")


if __name__ == "__main__":
    main()
