import csv
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SKILL_DIR = Path(__file__).resolve().parents[1] / "skills" / "fleetsight"
import sys

sys.path.insert(0, str(SKILL_DIR))

import fleetsight as fs


class FleetSightTests(unittest.TestCase):
    def test_normalization(self) -> None:
        self.assertEqual(fs.normalize_phone("+1 (212) 555-0099"), "2125550099")
        self.assertEqual(fs.normalize_phone(""), "")
        self.assertEqual(fs.normalize_email("  Admin@Example.COM "), "admin@example.com")
        self.assertEqual(fs.normalize_email("bad-email"), "")
        self.assertEqual(
            fs.normalize_address("100 Main Street,   Dallas, TX."),
            "100 main st dallas tx",
        )
        self.assertEqual(fs.normalize_ip(" 1.2.3.4 "), "1.2.3.4")

    def test_rarity_weight(self) -> None:
        self.assertEqual(fs.rarity_weight(1), 0.0)
        self.assertAlmostEqual(fs.rarity_weight(2), 1.0)
        self.assertAlmostEqual(fs.rarity_weight(4), 0.5)

    def test_scoring_and_clusters(self) -> None:
        carriers = [
            fs.CarrierRecord(
                carrier_id="A",
                legal_name="A Logistics",
                dot="1",
                mc="1",
                phone="555-100-0001",
                email="ops@alpha.com",
                address="10 First Street, Austin, TX",
                ip="10.0.0.1",
                timestamp="2026-01-01T00:00:00Z",
            ),
            fs.CarrierRecord(
                carrier_id="B",
                legal_name="B Transport",
                dot="2",
                mc="2",
                phone="5551000001",
                email="dispatch@alpha.com",
                address="10 First St Austin TX",
                ip="10.0.0.2",
                timestamp="2026-01-01T00:00:00Z",
            ),
            fs.CarrierRecord(
                carrier_id="C",
                legal_name="C Trucking",
                dot="3",
                mc="3",
                phone="555-900-0003",
                email="ops@charlie.net",
                address="77 Ridge Road, Reno, NV",
                ip="192.168.1.3",
                timestamp="2026-01-01T00:00:00Z",
            ),
        ]
        links, _ = fs.analyze_links(carriers)
        self.assertEqual(len(links), 1)
        top = links[0]
        self.assertEqual((top["carrier_a"], top["carrier_b"]), ("A", "B"))
        # phone (40) + email_domain (15) + address (25) with freq=2 each.
        self.assertAlmostEqual(top["score"], 80.0)
        clusters = fs.compute_clusters(links, ["A", "B", "C"], threshold=30.0)
        self.assertEqual(clusters[0]["size"], 2)
        self.assertEqual(clusters[0]["members"], ["A", "B"])

    def test_input_allowlist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            workspace = tmp_path / "workspace"
            allowed = tmp_path / "allowed_data"
            blocked = tmp_path / "blocked_data"
            for d in (workspace, allowed, blocked):
                d.mkdir(parents=True, exist_ok=True)
            ws_file = workspace / "x.csv"
            ok_file = allowed / "x.csv"
            bad_file = blocked / "x.csv"
            for f in (ws_file, ok_file, bad_file):
                f.write_text("carrier_id,legal_name,dot,mc,phone,email,address,ip,timestamp\n", encoding="utf-8")

            with patch.dict(os.environ, {}, clear=False):
                fs.ensure_input_allowed(ws_file, workspace)
                with self.assertRaises(ValueError):
                    fs.ensure_input_allowed(ok_file, workspace)

            with patch.dict(
                os.environ,
                {"FLEETSIGHT_ALLOWED_INPUT_DIRS": str(allowed)},
                clear=False,
            ):
                fs.ensure_input_allowed(ok_file, workspace)
                with self.assertRaises(ValueError):
                    fs.ensure_input_allowed(bad_file, workspace)

    def test_load_carriers_required_columns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["carrier_id", "legal_name"])
                writer.writerow(["C001", "Only Two Columns"])
            with self.assertRaises(ValueError):
                fs.load_carriers(path)


if __name__ == "__main__":
    unittest.main()

