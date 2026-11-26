
import axios from "axios";

export async function logoutWithAttendance(navigate) {
    const token = sessionStorage.getItem("access_token");

    if (token) {
        try {
            await axios.post(
                "http://localhost:8000/api/attendance/check-out",
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
        } catch (error) {
            console.error(
                "Check-out error:",
                error.response?.data || error
            );
        }
    }

    sessionStorage.clear();

    navigate("/login", {
        replace: true
    });
}
