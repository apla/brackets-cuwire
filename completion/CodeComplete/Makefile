
UNAME_S:=$(shell uname -s)

TARGET=CodeComplete
CXX=clang
CFLAGS=-std=c++11 -O2 -Wall -Wextra
ifeq ($(UNAME_S), Darwin)
CLANG_STDLIB:=-stdlib=libstdc++
CFLAGS+=$(CLANG_STDLIB)
endif
FLAGS=`llvm-config --cxxflags --ldflags` -lclang $(CFLAGS)

SAMPLE_DIR=samples
SAMPLES:=$(wildcard $(SAMPLE_DIR)/*.cc)
SAMPLES_OUT:=$(subst .cc,_out.txt,$(SAMPLES))

all: $(TARGET)

$(TARGET): $(TARGET).cc
	$(CXX) $(TARGET).cc -o $(TARGET) $(FLAGS)

run: $(SAMPLES_OUT)

$(SAMPLE_DIR)/%_out.txt: $(TARGET)
	-./$(TARGET) $(SAMPLE_DIR)/$*.cc $(shell echo $*  | sed 's/.*_l\([0-9][0-9]*\)c\([0-9][0-9]*\).*/\1 \2/') $(CLANG_STDLIB) > $@ 2>&1

clean: 
	@find . -name '*~' | xargs rm -f
	@rm -f $(TARGET) $(SAMPLES_OUT)
