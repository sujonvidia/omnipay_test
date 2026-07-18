import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/messageSlice';
import { gql, QUERIES } from '../lib/graphqlClient';

export default function ProtectedRoute({ children }) {
    const dispatch = useDispatch();
    const user = useSelector((s) => s.message.user);
    const [checked, setChecked] = useState(!!user);

    useEffect(() => {
        if (user) return;
        const token = localStorage.getItem('token');
        if (!token) { setChecked(true); return; }

        gql(QUERIES.me, undefined, 'me')
            .then((data) => {
                if (data?.me) dispatch(setUser(data.me));
            })
            .catch(() => {
                localStorage.removeItem('token');
            })
            .finally(() => setChecked(true));
    }, [user, dispatch]);

    if (!checked) return null;

    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;

    return children;
}
