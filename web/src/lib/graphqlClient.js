const BASE = import.meta.env.VITE_BASE_URL || '';

export async function gql(query, variables, operationName) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/graphql`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ query, variables, operationName }),
    });
    const json = await res.json();
    if (json.errors?.length) {
        throw new Error(json.errors[0].message || 'Request failed');
    }
    return json.data;
}

export const MUTATIONS = {
    signupOtpSend: `
        mutation signup_otp_send($input: SignupOtpSendInput!) {
            signup_otp_send(input: $input) { status message }
        }
    `,
    signup: `
        mutation signup($input: SignupInput!) {
            signup(input: $input) {
                status message
                data { id email firstname lastname company_id role token refresh_token }
            }
        }
    `,
    login: `
        mutation login($input: LoginInput!) {
            login(input: $input) {
                status message
                data { id email firstname lastname company_id role token refresh_token }
            }
        }
    `,
    forgotPassword: `
        mutation forgot_password($input: ForgotPasswordInput!) {
            forgot_password(input: $input) { status message }
        }
    `,
    emailOtpVerify: `
        mutation email_otp_verify($input: EmailOtpVerifyInput!) {
            email_otp_verify(input: $input) { status message }
        }
    `,
    setNewPassword: `
        mutation set_new_password($input: SetNewPasswordInput!) {
            set_new_password(input: $input) { status message }
        }
    `,
    logout: `
        mutation logout { logout { status message } }
    `,
};

export const QUERIES = {
    me: `
        query me {
            me { id email firstname lastname company_id role cardpointe_profile_id cardpointe_acct_id }
        }
    `,
};
