import { Navigate, Route, Routes } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DoctorLayout } from "@/features/doctor/DoctorLayout";
import { DoctorCalendarPage } from "@/features/doctor/calendar/DoctorCalendarPage";
import { MyPatientsPage } from "@/features/doctor/patients/MyPatientsPage";
import { ConsultationPage } from "@/features/doctor/consultation/ConsultationPage";
import { ProfilePage } from "@/features/doctor/profile/ProfilePage";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { DashboardPage } from "@/features/admin/dashboard/DashboardPage";
import { StaffPage } from "@/features/admin/staff/StaffPage";
import { StaffFormPage } from "@/features/admin/staff/StaffFormPage";
import { RoomsPage } from "@/features/admin/rooms/RoomsPage";
import { SlotsPage } from "@/features/admin/slots/SlotsPage";
import { TreatmentsPage } from "@/features/admin/treatments/TreatmentsPage";
import { ReceptionistLayout } from "@/features/reception/ReceptionistLayout";
import { MasterCalendarPage } from "@/features/reception/calendar/MasterCalendarPage";
import { CheckInPage } from "@/features/reception/checkin/CheckInPage";
import { WaitlistPage } from "@/features/reception/waitlist/WaitlistPage";
import { CheckoutPage } from "@/features/reception/checkout/CheckoutPage";
import { PatientsPage } from "@/features/reception/patients/PatientsPage";
import { PatientFormPage } from "@/features/reception/patients/PatientFormPage";
import { PatientLayout } from "@/features/patient/PatientLayout";
import { HomePage } from "@/features/patient/home/HomePage";
import { BookAppointmentPage } from "@/features/patient/booking/BookAppointmentPage";
import { AppointmentsPage } from "@/features/patient/appointments/AppointmentsPage";
import { AppointmentDetailPage } from "@/features/patient/appointments/AppointmentDetailPage";
import { PatientProfilePage } from "@/features/patient/profile/PatientProfilePage";
import { StaffProfilePage } from "@/features/staff/profile/StaffProfilePage";
import { MarketingLayout } from "@/features/marketing/MarketingLayout";
import { HomePage as MarketingHomePage } from "@/features/marketing/HomePage";
import { ServicesPage } from "@/features/marketing/ServicesPage";
import { AboutPage } from "@/features/marketing/AboutPage";
import { ContactPage } from "@/features/marketing/ContactPage";
import { ToastHost } from "@/components/ui/ToastHost";
import { roleHomePath } from "@/lib/roleHomePath";

/** The marketing site's index route — signed-in users land in their own portal instead of the
 *  public homepage; everyone else sees the marketing homepage. */
function MarketingIndex() {
  const { accessToken, user } = useAppSelector((s) => s.auth);
  if (accessToken && user) return <Navigate to={roleHomePath(user.role)} replace />;
  return <MarketingHomePage />;
}

function App() {
  return (
    <>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<MarketingIndex />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute allow={["DOCTOR"]} />}>
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<DoctorCalendarPage />} />
            <Route path="patients" element={<MyPatientsPage />} />
            <Route path="consultation/:appointmentId" element={<ConsultationPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={["RECEPTIONIST", "ADMIN"]} />}>
          <Route path="/reception" element={<ReceptionistLayout />}>
            <Route index element={<MasterCalendarPage />} />
            <Route path="checkin" element={<CheckInPage />} />
            <Route path="waitlist" element={<WaitlistPage />} />
            <Route path="checkout/:appointmentId" element={<CheckoutPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/new" element={<PatientFormPage />} />
            <Route path="patients/:patientId/edit" element={<PatientFormPage />} />
            <Route path="profile" element={<StaffProfilePage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/new" element={<StaffFormPage />} />
            <Route path="staff/:staffId/edit" element={<StaffFormPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="slots" element={<SlotsPage />} />
            <Route path="treatments" element={<TreatmentsPage />} />
            <Route path="profile" element={<StaffProfilePage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allow={["PATIENT"]} />}>
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<HomePage />} />
            <Route path="book" element={<BookAppointmentPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="appointments/:appointmentId" element={<AppointmentDetailPage />} />
            <Route path="profile" element={<PatientProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </>
  );
}

export default App;
