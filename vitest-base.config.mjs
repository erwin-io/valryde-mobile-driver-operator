// Keep Windows worker startup bounded on developer machines running several agents.
export default { test: { pool: 'threads', maxWorkers: 1 } };
