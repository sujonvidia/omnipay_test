import { createSlice } from '@reduxjs/toolkit';

// Named `message` (not `auth`) so ported finance components that read
// `useSelector(s => s.message.user)` (e.g. FinanceLayout.jsx) work with zero edits.
const initialState = {
    user: null,
};

const messageSlice = createSlice({
    name: 'message',
    initialState,
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
        },
        clearUser(state) {
            state.user = null;
        },
    },
});

export const { setUser, clearUser } = messageSlice.actions;
export default messageSlice.reducer;
