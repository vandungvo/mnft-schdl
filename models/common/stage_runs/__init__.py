"""schema_version 5 engine: fixed-size RUNS per stage (dataset/wheel-factory-small).

Kept separate from the schema-4 engine in models/common (still used by backend/)
so neither can silently change the other. models.common.instance.load() and
models.common.experiment route a schema-5 input here.
"""
