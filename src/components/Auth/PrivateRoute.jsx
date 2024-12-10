import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = ({ children, role }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (role && user.role !== role) {
        // Redirect based on role
        if (user.role === 'seller') {
            return <Navigate to="/seller" />;
        } else {
            return <Navigate to="/" />;
        }
    }

    return children;
};

export default PrivateRoute;