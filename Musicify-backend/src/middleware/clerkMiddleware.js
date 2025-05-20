// No imports needed for this simple middleware

export const clerkMiddleware = (req, res, next) => {
  // Simple middleware that doesn't use path-to-regexp
  next();
};

