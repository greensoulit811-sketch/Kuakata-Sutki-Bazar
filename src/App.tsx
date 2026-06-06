import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FacebookPixelProvider } from "@/components/FacebookPixelProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import { Suspense, lazy } from "react";
import { createOptimizedQueryClient } from "@/lib/query-config";

// Performance: Lazy load all route components
// Store pages - lazy loaded
const Index = lazy(() => import("./pages/Index"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const LandingPageView = lazy(() => import("./pages/LandingPageView"));

// Admin pages - lazy loaded
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminRegisterPage = lazy(() => import("./pages/admin/AdminRegisterPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetails = lazy(() => import("./pages/admin/AdminOrderDetails"));
const AdminSlider = lazy(() => import("./pages/admin/AdminSlider"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCourierSettings = lazy(() => import("./pages/admin/AdminCourierSettings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminShippingMethods = lazy(() => import("./pages/admin/AdminShippingMethods"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminCheckoutLeads = lazy(() => import("./pages/admin/AdminCheckoutLeads"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/AdminPaymentMethods"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminLandingPages = lazy(() => import("./pages/admin/AdminLandingPages"));
const AdminHomepage = lazy(() => import("./pages/admin/AdminHomepage"));
const ProtectedAdminRoute = lazy(() => import("./components/admin/ProtectedAdminRoute"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Performance optimization: Use optimized QueryClient with best practice defaults
const queryClient = createOptimizedQueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteSettingsProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <FacebookPixelProvider>
                  <ScrollToTop />
                  <DynamicFavicon />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Store Routes - No auth required */}
                      <Route path="/" element={<Index />} />
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/category/:slug" element={<CategoryPage />} />
                      <Route path="/product/:slug" element={<ProductDetailsPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/order-success" element={<OrderSuccessPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/track-order" element={<TrackOrderPage />} />
                      <Route path="/lp/:slug" element={<LandingPageView />} />

                      {/* Admin Auth Routes - No protection */}
                      <Route path="/admin/login" element={<AdminLoginPage />} />
                      <Route path="/admin/register" element={<AdminRegisterPage />} />

                      {/* Protected Admin Routes */}
                      <Route element={<ProtectedAdminRoute />}>
                        <Route path="/admin" element={<AdminLayout />}>
                          <Route index element={<AdminDashboard />} />
                          <Route path="products" element={<AdminProducts />} />
                          <Route path="categories" element={<AdminCategories />} />
                          <Route path="orders" element={<AdminOrders />} />
                          <Route path="orders/:id" element={<AdminOrderDetails />} />
                          <Route path="slider" element={<AdminSlider />} />
                          <Route path="settings" element={<AdminSettings />} />
                          <Route path="courier" element={<AdminCourierSettings />} />
                          <Route path="coupons" element={<AdminCoupons />} />
                          <Route path="shipping" element={<AdminShipping />} />
                          <Route path="shipping-methods" element={<AdminShippingMethods />} />
                          <Route path="reviews" element={<AdminReviews />} />
                          <Route path="leads" element={<AdminCheckoutLeads />} />
                          <Route path="users" element={<AdminUsers />} />
                          <Route path="payment-methods" element={<AdminPaymentMethods />} />
                          <Route path="pages" element={<AdminPages />} />
                          <Route path="landing-pages" element={<AdminLandingPages />} />
                          <Route path="homepage" element={<AdminHomepage />} />
                        </Route>
                      </Route>

                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  <CookieConsentBanner />
                  <WhatsAppWidget />
                </FacebookPixelProvider>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
