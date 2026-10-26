const parsePagination = (query, defaultLimit = 10, maxLimit = 100) => {
  const requested = query.page !== undefined || query.limit !== undefined;
  if (!requested) return { requested: false, page: 1, limit: undefined, offset: undefined };
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { requested: true, page, limit, offset: (page - 1) * limit };
};

const paginationMeta = (page, limit, total) => ({ page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
const extractWindowTotal = rows => rows.length ? Number(rows[0].total_count || 0) : 0;
const stripWindowTotal = rows => rows.map(({ total_count, ...row }) => row);

module.exports = { parsePagination, paginationMeta, extractWindowTotal, stripWindowTotal };
