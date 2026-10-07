"""核对已保存的运行证据；不重新执行项目或授予学习者资格。"""
import copy
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "docs/runtime-verification/2026-10-06.json"
EXPECTED = {"changelog-writer-from-git": 25, "distributed-eval-farm": 26,
            "desktop-control": 29, "durable-agent-jobs": 27}

def validate_totals(receipt):
    rows = receipt["tests"]
    pairs = {(v, p) for v in ("upstream", "current") for p in EXPECTED}
    if len(rows) != 8 or {(r["variant"], r["project"]) for r in rows} != pairs:
        raise ValueError("incomplete or duplicate test coverage")
    for row in rows:
        if (row["exit"] != 0 or row["skipped"] != 0
                or row["tests"] != EXPECTED[row["project"]]
                or row["mode"] != "solution" or row["certificateEligible"] is not False):
            raise ValueError("invalid execution claim")
    if sum(r["tests"] for r in rows) != receipt["totals"]["actualTestExecutions"]:
        raise ValueError("incorrect total")

class RuntimeReceiptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receipt = json.loads(RECEIPT.read_text())

    def test_totals_are_complete_and_reference_only(self):
        validate_totals(self.receipt)
        self.assertEqual(self.receipt["totals"]["actualTestExecutions"], 214)

    def test_missing_duplicate_and_inflated_claims_are_rejected(self):
        for mutation in ("missing", "duplicate", "inflated", "certificate"):
            r = copy.deepcopy(self.receipt)
            if mutation == "missing": r["tests"].pop()
            elif mutation == "duplicate": r["tests"][-1] = r["tests"][0]
            elif mutation == "inflated": r["totals"]["actualTestExecutions"] += 1
            else: r["tests"][0]["certificateEligible"] = True
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_totals(r)

    def test_raw_evidence_hashes_and_sizes(self):
        files = self.receipt["evidenceFiles"]
        self.assertEqual(len(files), 32)
        for path, info in files.items():
            with self.subTest(path=path):
                target = (ROOT / path).resolve()
                self.assertTrue(target.is_relative_to(ROOT / "docs/runtime-verification/2026-10-06"))
                raw = target.read_bytes()
                self.assertEqual(len(raw), info["bytes"])
                self.assertEqual(hashlib.sha256(raw).hexdigest(), info["sha256"])

    def test_reports_support_each_summary(self):
        for row in self.receipt["tests"]:
            raw = json.loads((ROOT / row["reportPath"]).read_text())
            p = raw["projects"][0]
            with self.subTest(project=row["project"], variant=row["variant"]):
                self.assertFalse(raw["certificateEligible"])
                self.assertEqual(p["mode"], "solution")
                self.assertTrue(p["allStagesPassed"])
                self.assertEqual(sum(s["tests"] for s in p["stages"]), row["tests"])
                self.assertEqual(len(p["stages"]), 4)
                self.assertTrue(all(s["status"] == "pass" and s["skippedTests"] == 0 for s in p["stages"]))
                self.assertEqual(hashlib.sha256((ROOT / row["reportPath"]).read_bytes()).hexdigest(), row["reportSHA256"])
                self.assertEqual(hashlib.sha256((ROOT / row["logPath"]).read_bytes()).hexdigest(), row["logSHA256"])

    def test_source_snapshot_inventory(self):
        self.assertEqual(self.receipt["pinnedUpstream"], "c02ca08d8a49ce24c3c1c1cf8e3b422f2c7393ca")
        for rows in self.receipt["sourceSnapshots"].values():
            self.assertEqual(len(rows), 147)
            self.assertEqual(len({r["path"] for r in rows}), 147)
            for r in rows:
                self.assertRegex(r["sha256"], r"^[a-f0-9]{64}$")

    def test_demo_scope_and_prediction_denominator(self):
        rows = self.receipt["demos"]
        self.assertEqual(len(rows), 8)
        self.assertEqual({(r["variant"], r["project"]) for r in rows},
                         {(v, p) for v in ("upstream", "current") for p in EXPECTED})
        for row in rows:
            self.assertEqual(row["exit"], 0)
            for kind in ("stdout", "stderr"):
                self.assertEqual(hashlib.sha256((ROOT / row[kind + "Path"]).read_bytes()).hexdigest(), row[kind + "SHA256"])
            if row["project"] == "distributed-eval-farm":
                final = row["summary"]["finalSnapshot"]
                self.assertEqual((final["evaluated"], final["correct"], final["complete"]), (4, 3, True))
            if row["project"] == "desktop-control": self.assertFalse(row["summary"]["nativeVerified"])
            if row["project"] == "durable-agent-jobs": self.assertTrue(row["summary"]["reusedExistingEffect"])

    def test_limits_do_not_overclaim(self):
        limits = self.receipt["limits"]
        self.assertTrue(limits["executedInPreviousSession"])
        for k, v in limits.items():
            if k != "executedInPreviousSession": self.assertIs(v, False, k)
        rust = next(t for t in self.receipt["toolchains"] if t["name"] == "rust")
        self.assertEqual(rust["explicitTarget"], "aarch64-unknown-linux-musl")

if __name__ == "__main__":
    unittest.main()
