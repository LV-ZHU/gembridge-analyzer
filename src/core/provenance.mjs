export const SOURCE_KIND={RAW:'raw_api',DERIVED:'derived',MANUAL:'manual',HEURISTIC:'heuristic',ANALYSIS:'analysis'};
export function sourceRef(kind, detail={}){return {kind,...detail}}
export function provenanceBlock(sources=[], derived=[]){return {sources,derived}}
