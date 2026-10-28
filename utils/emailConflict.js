const sendEmailConflict = (res, error) => {
  if (error?.code !== 'EMAIL_ALREADY_EXISTS') return false;

  res.status(409).json({
    success: false,
    message: 'This email address cannot be used',
    field: 'email',
  });
  return true;
};

module.exports = { sendEmailConflict };
