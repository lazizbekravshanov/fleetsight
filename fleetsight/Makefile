PYTHON ?= python3
OPENCLAW_WORKSPACE ?= $(CURDIR)/.workspace

.PHONY: verify sample explain test

verify:
	$(PYTHON) -m unittest discover -s tests -p "test_*.py"
	OPENCLAW_WORKSPACE=$(OPENCLAW_WORKSPACE) $(PYTHON) skills/fleetsight/fleetsight.py verify

sample:
	OPENCLAW_WORKSPACE=$(OPENCLAW_WORKSPACE) $(PYTHON) skills/fleetsight/fleetsight.py sample-data

explain:
	OPENCLAW_WORKSPACE=$(OPENCLAW_WORKSPACE) $(PYTHON) skills/fleetsight/fleetsight.py explain

test:
	$(PYTHON) -m unittest discover -s tests -p "test_*.py"
