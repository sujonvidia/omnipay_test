import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import FinanceLayout from './components/finance/FinanceLayout';
import FinanceHome from './components/finance/FinanceHome';
import FinanceFinancials from './components/finance/FinanceFinancials';
import FinanceAccounts from './components/finance/FinanceAccounts';
import FinanceActivity from './components/finance/FinanceActivity';
import FinanceApprovals from './components/finance/FinanceApprovals';
import FinanceCollections from './components/finance/FinanceCollections';
import FinanceQuotes from './components/finance/FinanceQuotes';
import FinanceReceivables from './components/finance/FinanceReceivables';
import FinanceSettings from './components/finance/FinanceSettings';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
                <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

                <Route
                    path="/connect/finance"
                    element={
                        <ProtectedRoute>
                            <FinanceLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="home" element={<FinanceHome />} />
                    <Route path="financials" element={<FinanceFinancials />} />
                    <Route path="accounts" element={<FinanceAccounts />} />
                    <Route path="activity" element={<FinanceActivity />} />
                    <Route path="approvals" element={<FinanceApprovals />} />
                    <Route path="collections" element={<FinanceCollections />} />
                    <Route path="quotes" element={<FinanceQuotes />} />
                    <Route path="receivables" element={<FinanceReceivables />} />
                    <Route path="settings" element={<FinanceSettings />} />
                    <Route index element={<Navigate to="home" replace />} />
                </Route>

                <Route path="/" element={<Navigate to="/connect/finance/home" replace />} />
                <Route path="*" element={<Navigate to="/connect/finance/home" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
