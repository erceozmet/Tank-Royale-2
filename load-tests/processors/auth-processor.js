/**
 * Artillery processor for authentication scenarios
 */

// Pre-created test users for login scenarios
const TEST_USERS = [
  { email: 'loadtest1@test.com', password: 'TestPassword123!' },
  { email: 'loadtest2@test.com', password: 'TestPassword123!' },
  { email: 'loadtest3@test.com', password: 'TestPassword123!' },
  { email: 'loadtest4@test.com', password: 'TestPassword123!' },
  { email: 'loadtest5@test.com', password: 'TestPassword123!' },
];

/**
 * Set existing user credentials for login tests
 */
function setExistingUser(requestParams, context, ee, next) {
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  context.vars.email = user.email;
  context.vars.password = user.password;
  return next();
}

/**
 * Generate random MMR for matchmaking tests
 */
function setRandomMMR(requestParams, context, ee, next) {
  context.vars.mmr = 1000 + Math.floor(Math.random() * 1000); // 1000-2000
  return next();
}

/**
 * Log response for debugging
 */
function logResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.error('Error response:', {
      status: response.statusCode,
      body: response.body,
      url: requestParams.url,
    });
  }
  return next();
}

module.exports = {
  setExistingUser,
  setRandomMMR,
  logResponse,
};
