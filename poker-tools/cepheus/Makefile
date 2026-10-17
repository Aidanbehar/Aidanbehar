# Regenerates poker/cepheus/cepheus-strategy.bin. Needs gcc and pthreads; nothing here is
# needed to run the website. See README.md.
CC = gcc
CFLAGS = -O3 -march=native -Wall -Wno-unused-const-variable
THREADS ?= 4
SECONDS ?= 6000
K ?= 50

cfrplus_hulhe: cfrplus_hulhe.c acpc_eval.h evalHandTables
	$(CC) $(CFLAGS) -o $@ cfrplus_hulhe.c -lpthread -lm

prep.bin: cfrplus_hulhe
	./cfrplus_hulhe selftest
	./cfrplus_hulhe prep $(K) $(THREADS)

train: prep.bin
	mkdir -p run
	./cfrplus_hulhe train $(SECONDS) $(THREADS) run

export:
	./cfrplus_hulhe export run ../../poker/cepheus/cepheus-strategy.bin "$(NOTE)"

clean:
	rm -f cfrplus_hulhe flopfeat.cache
.PHONY: train export clean
