import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import {
  Dashboard,
  Documents,
  Favorites,
  Archive,
  Search,
  Chat,
  Settings,
  Users,
  Login,
  Register,
} from "./pages";
import { DocumentViewer } from "./components/documents";
import { PrivateRoute } from "./components/auth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/",
    element: (
      <PrivateRoute>
        <RootLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "documents",
        element: <Documents />,
      },
      {
        path: "documents/:id",
        element: <DocumentViewer />,
      },
      {
        path: "favorites",
        element: <Favorites />,
      },
      {
        path: "archive",
        element: <Archive />,
      },
      {
        path: "search",
        element: <Search />,
      },
      {
        path: "chat",
        element: <Chat />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "users",
        element: <Users />,
      },
    ],
  },
]);
