const sendSuccess = (res, statusCode = 200, message = "Success", data = {}) => {
  res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, statusCode = 500, message = "Error", errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
};

const sendPaginated = (res, data, page, limit, total) => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
