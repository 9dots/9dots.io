run: components
	@NODE_PATH=lib ./bin/9dots.io

components:
	@component install

clean:
	@rm -fr components

.PHONY: run clean