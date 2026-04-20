import { createBrowserRouter, Navigate } from "react-router-dom";
import { ReactNode } from "react";

import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Register } from "./pages/Register";
import { NotFound } from "./pages/NotFound";
import { ErrorBoundary } from "./pages/ErrorBoundary";
import { Profile } from "./pages/Profile";
import { Community } from "./pages/Community";
import { InternalChatPage } from "./pages/shared/InternalChatPage";

import { OwnerDashboard } from "./pages/owner/OwnerDashboard";
import { RegisterVehicle } from "./pages/owner/RegisterVehicle";
import { BrowseParkingLots } from "./pages/owner/BrowseParkingLots";
import { ParkingLotDetails } from "./pages/owner/ParkingLotDetails";
import { ParkingZoneSelection } from "./pages/owner/ParkingZoneSelection";
import { VehicleTypeSelection } from "./pages/owner/VehicleTypeSelection";
import { SpotSelection } from "./pages/owner/SpotSelection";
import { VehicleStatus } from "./pages/owner/VehicleStatus";
import { ParkingRegistration } from "./pages/owner/ParkingRegistration";
import { TopUpCoins } from "./pages/owner/TopUpCoins";
import { VehicleEntryExitLog as OwnerVehicleEntryExitLog } from "./pages/owner/VehicleEntryExitLog";

import { SupervisorDashboard } from "./pages/supervisor/SupervisorDashboard";
import { GateManagement } from "./pages/supervisor/GateManagement";
import { DualGateMonitoring } from "./pages/supervisor/DualGateMonitoring";
import { SuspiciousVehicles } from "./pages/supervisor/SuspiciousVehicles";
import { SuspiciousHistory } from "./pages/supervisor/SuspiciousHistory";
import { ShiftManagement } from "./pages/supervisor/ShiftManagement";
import { VehicleEntryExitLog as SupervisorVehicleEntryExitLog } from "./pages/supervisor/VehicleEntryExitLog";
import { SupervisorProfile } from "./pages/supervisor/SupervisorProfile";

import { SupportStaffDashboard } from "./pages/support/SupportStaffDashboard";
import { SupportProfile } from './pages/support/SupportProfile';

import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ParkingLotConfig } from "./pages/admin/ParkingLotConfig";
import { Statistics } from "./pages/admin/Statistics";
import { ServiceSubscription } from "./pages/admin/ServiceSubscription";
import { CommunityModeration } from "./pages/admin/CommunityModeration";
import { ShiftVideoLogs } from "./pages/admin/ShiftVideoLogs";
import { StaffManagement } from "./pages/admin/StaffManagement";
import { MyParkingLots } from "./pages/admin/MyParkingLots";
import { ServiceRegistration } from "./pages/admin/ServiceRegistration";
import { CameraManagement } from "./pages/admin/CameraManagement";

import { ProviderDashboard } from "./pages/provider/ProviderDashboard";
import { VirtualCoinSettings } from "./pages/provider/VirtualCoinSettings";
import { ServiceManagement } from "./pages/provider/ServiceManagement";
import { DeviceManagement } from "./pages/provider/DeviceManagement";
import { AccountManagement } from "./pages/provider/AccountManagement";
import { ProviderStatistics } from "./pages/provider/ProviderStatistics";
import { SystemSettings } from "./pages/provider/SystemSettings";
import { PackageManagement } from "./pages/provider/PackageManagement";
import { MaintenanceSchedule } from "./pages/provider/MaintenanceSchedule";

import { CommunityFeed } from "./pages/community/CommunityFeed";
import { ParkingReviews } from "./pages/community/ParkingReviews";
import { TheftReportPage } from "./pages/community/TheftReportPage";
import { SupportPage } from "./pages/community/SupportPage";
import { CommunityChat } from "./pages/community/CommunityChat";
import { CoinGames } from "./pages/community/CoinGames";

import { ParkingLotEditPage, ParkingLotDetailsPage } from "./pages/admin/MyParkingLots";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthCallback } from "./pages/AuthCallback";

const ALL_ROLES = ["owner", "supervisor", "admin", "provider", "support"];
const OWNER_ROLES = ["owner"];
const SUPERVISOR_ROLES = ["supervisor"];
const SUPPORT_ROLES = ["support"];
const ADMIN_ROLES = ["admin"];
const PROVIDER_ROLES = ["provider"];

function Guard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: ReactNode;
}) {
  return <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  // Public
  {
    path: "/",
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
    errorElement: <ErrorBoundary />,
  },
  {
  path: "/auth/callback",
  element: <AuthCallback />,
  errorElement: <ErrorBoundary />,
},

  // Shared pages: ai đăng nhập cũng vào được
  {
    path: "/profile",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <Profile />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <Community />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community/feed",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <CommunityFeed />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community/reviews",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <ParkingReviews />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community/theft",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <TheftReportPage />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community/chat",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <CommunityChat />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community/coin-games",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <CoinGames />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/community/support",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <SupportPage />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/internal-chat",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <InternalChatPage />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },

  // Owner
  {
    path: "/owner",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <OwnerDashboard />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/register-vehicle",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <RegisterVehicle />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/parking-lots",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <BrowseParkingLots />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/parking-lot/:id",
    element: (
      <Guard allowedRoles={ALL_ROLES}>
        <ParkingLotDetails />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/parking/:lotId/zones",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <ParkingZoneSelection />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/parking/:lotId/zone/:zoneId/select-vehicle",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <VehicleTypeSelection />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/parking/:lotId/zone/:zoneId/vehicle/:vehicleId/select-spot",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <SpotSelection />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/vehicle-status",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <VehicleStatus />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/parking-registration",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <ParkingRegistration />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/topup",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <TopUpCoins />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/owner/vehicle-logs",
    element: (
      <Guard allowedRoles={OWNER_ROLES}>
        <OwnerVehicleEntryExitLog />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },

  // Supervisor
  {
    path: "/supervisor",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <SupervisorDashboard />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/gate",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <GateManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/dual-gate",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <DualGateMonitoring />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/suspicious-vehicles",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <SuspiciousVehicles />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/suspicious-history",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <SuspiciousHistory />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/shift",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <ShiftManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/vehicle-logs",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <SupervisorVehicleEntryExitLog />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/supervisor/profile",
    element: (
      <Guard allowedRoles={SUPERVISOR_ROLES}>
        <SupervisorProfile />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },

  // Support
  {
    path: "/support",
    element: (
      <Guard allowedRoles={SUPPORT_ROLES}>
        <SupportStaffDashboard />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/support/profile",
    element: (
      <Guard allowedRoles={SUPPORT_ROLES}>
        <SupportProfile />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },

  // Admin
  {
    path: "/admin",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <AdminDashboard />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/parking-config",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <ParkingLotConfig />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/statistics",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <Statistics />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/service-subscription",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <ServiceSubscription />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/community-moderation",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <CommunityModeration />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/video-logs",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <ShiftVideoLogs />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/staff-management",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <StaffManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/my-parking-lots",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <MyParkingLots />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/service-registration",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <ServiceRegistration />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/camera-management",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <CameraManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/parking-lot/:id/edit",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <ParkingLotEditPage />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/admin/parking-lot/:id/details",
    element: (
      <Guard allowedRoles={ADMIN_ROLES}>
        <ParkingLotDetailsPage />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },

  // Provider
  {
    path: "/provider",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <ProviderDashboard />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/coin-settings",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <VirtualCoinSettings />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/services",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <ServiceManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/devices",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <DeviceManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/accounts",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <AccountManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/statistics",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <ProviderStatistics />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/system-settings",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <SystemSettings />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/package-management",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <PackageManagement />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/provider/maintenance-schedule",
    element: (
      <Guard allowedRoles={PROVIDER_ROLES}>
        <MaintenanceSchedule />
      </Guard>
    ),
    errorElement: <ErrorBoundary />,
  },

  // Not found / unauthorized
  {
    path: "/not-found",
    element: <NotFound />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "*",
    element: <Navigate to="/not-found" replace />,
  },
]);