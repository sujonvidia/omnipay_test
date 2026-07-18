const { gql } = require('apollo-server-express');

module.exports = gql`
  type User {
    id: ID
    email: String
    firstname: String
    lastname: String
    company_id: String
    role: String
    is_verified: Boolean
    cardpointe_profile_id: String
    cardpointe_acct_id: String
    token: String
    refresh_token: String
  }

  type AuthResponse {
    status: Boolean
    message: String
    data: User
  }

  type SimpleResponse {
    status: Boolean
    message: String
  }

  input SignupOtpSendInput {
    email: String!
    firstname: String
    lastname: String
  }

  input SignupInput {
    email: String!
    code: String!
    password: String!
    firstname: String
    lastname: String
    phone: String
    # Provide these to create a new company (signup as the first/admin user);
    # omit + provide company_id to join an existing company as a member.
    company_name: String
    industry: String
    domain_name: String
    company_size: String
    role: String
    company_id: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ForgotPasswordInput {
    email: String!
  }

  input EmailOtpVerifyInput {
    email: String!
    code: String!
  }

  input SetNewPasswordInput {
    email: String!
    code: String!
    password: String!
  }

  input UpdateUserInput {
    firstname: String
    lastname: String
    phone: String
  }

  type Query {
    me: User
    user(id: ID): User
    users: [User]
  }

  type Mutation {
    signup_otp_send(input: SignupOtpSendInput!): SimpleResponse
    signup(input: SignupInput!): AuthResponse
    login(input: LoginInput!): AuthResponse
    forgot_password(input: ForgotPasswordInput!): SimpleResponse
    email_otp_verify(input: EmailOtpVerifyInput!): SimpleResponse
    set_new_password(input: SetNewPasswordInput!): SimpleResponse
    update_user(input: UpdateUserInput!): AuthResponse
    logout: SimpleResponse
  }
`;
