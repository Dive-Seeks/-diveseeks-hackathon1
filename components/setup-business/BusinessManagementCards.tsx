"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Edit2,
  Eye,
  Calendar,
  Clock,
  Building2,
  ChevronLeft,
  X,
  CreditCard,
  Users,
  MapPin,
  Globe,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { useSetupBusinessStore } from "@/lib/setup-business-store";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { socket } from "@/lib/socket";

interface Business {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BusinessListResponse {
  data: Business[];
  meta?: {
    totalPages?: number;
  };
}

// Reuse the InfoItem and SectionHeader logic from the previous modal design
const InfoItem = ({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: any;
  icon?: any;
  className?: string;
}) => (
  <div className={cn("space-y-1.5 min-w-0", className)}>
    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
      {label}
    </p>
    <div className="flex items-start gap-2.5">
      {Icon && (
        <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <p className="text-sm font-semibold leading-snug wrap-break-word whitespace-pre-wrap overflow-hidden">
        {value || "N/A"}
      </p>
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-3 mb-4 text-primary border-b border-primary/10 pb-2">
    <div className="p-2 rounded-lg bg-primary/5">
      <Icon className="size-5" />
    </div>
    <h3 className="font-bold text-lg tracking-tight">{title}</h3>
  </div>
);

export function BusinessManagementCards() {
  const [page, setPage] = React.useState(1);
  const [viewingBusiness, setViewingBusiness] = React.useState<any>(null);
  const router = useRouter();
  const { setFullState } = useSetupBusinessStore();

  const { data, isLoading: loading } = useQuery<BusinessListResponse>({
    queryKey: ["businesses", page],
    queryFn: async () => {
      const response = await api.get(`/setup-business?page=${page}&limit=6`);
      return response.data.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: !socket.connected,
  });

  const businesses: Business[] = data?.data ?? [];
  const totalPages = data?.meta?.totalPages || 1;

  const handleView = async (business: Business) => {
    try {
      const response = await api.get(`/setup-business/${business.id}`);
      setViewingBusiness(response.data.data);
      // Scroll to top of the view section smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Failed to load business details for viewing:", error);
      toast.error("Failed to load business details");
    }
  };

  const handleEdit = async (business: any) => {
    try {
      const response = await api.get(`/setup-business/${business.id}`);
      const data = response.data.data;

      if (!data) {
        toast.error("No data found for this business");
        return;
      }

      // 1. Map Basics
      const basics = {
        region:
          data.region || data.registeredAddress?.region || "United Kingdom",
        businessName: data.name || "",
        companyName: data.companyName || "",
        businessType: data.businessType || "Sole Trader",
        companyEmail: data.companyEmail || "",
        companyPhone: data.companyPhone || "",
        registrationNumber: data.registrationNumber || "",
        registeredAddress: {
          street: data.registeredAddress?.street || "",
          locality: data.registeredAddress?.locality || "",
          region: data.registeredAddress?.region || "",
          postalCode: data.registeredAddress?.postalCode || "",
        },
      };

      // 2. Map Directors
      const directors = (data.directors || []).map((d: any) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        dob: d.dob,
        email: d.email,
        phone: d.phone,
        residentialAddress: {
          street: d.residentialAddress?.street || "",
          locality: d.residentialAddress?.locality || "",
          region: d.residentialAddress?.region || "",
          postalCode: d.residentialAddress?.postalCode || "",
        },
      }));

      // 3. Map Site (First one)
      const site = data.sites?.[0];
      const StoreInformation = {
        siteName: site?.name || "",
        siteAddress: {
          street: site?.siteAddress?.street || "",
          locality: site?.siteAddress?.locality || "",
          region: site?.siteAddress?.region || "",
          postalCode: site?.siteAddress?.postalCode || "",
        },
        currency: site?.currency || "GBP",
        businessType: site?.businessType || "Restaurant",
        is24_7: site?.is_24_7 || false,
        selectedDays: site?.operatingHours?.map((h: any) => h.day) || [],
        dailyTimeSlots:
          site?.operatingHours?.map((h: any) => ({
            day: h.day,
            openTime: h.open_time,
            closeTime: h.close_time,
          })) || [],
        holidays:
          site?.holidays?.map((h: any) => ({
            id: h.id,
            name: h.name,
            date: h.date,
            isClosed: h.is_closed,
            openTime: h.open_time,
            closeTime: h.close_time,
          })) || [],
        holidayExceptions: site?.holidayExceptions || [],
      };

      // 4. Map Bank Details
      const bankDetails = data.bankDetails
        ? {
            accountName: data.bankDetails.accountName || "",
            bankName: data.bankDetails.bankName || "",
            accountNumber: data.bankDetails.accountNumber || "",
            sortCode: data.bankDetails.sortCode || "",
            iban: data.bankDetails.iban || "",
            bic: data.bankDetails.bic || "",
            routingNumber: data.bankDetails.routingNumber || "",
            ifscCode: data.bankDetails.ifscCode || "",
            bsbNumber: data.bankDetails.bsbNumber || "",
            transitNumber: data.bankDetails.transitNumber || "",
            institutionNumber: data.bankDetails.institutionNumber || "",
            accountType: data.bankDetails.accountType || "",
            proofOfBank: data.bankDetails.proofOfBank || null,
          }
        : {
            accountName: "",
            bankName: "",
            accountNumber: "",
            sortCode: "",
            iban: "",
            bic: "",
            routingNumber: "",
            ifscCode: "",
            bsbNumber: "",
            transitNumber: "",
            institutionNumber: "",
            accountType: "",
            proofOfBank: null,
          };

      let step = 1;
      if (data.status === "SUBMITTED" || data.status === "ACTIVE") {
        step = 4;
      } else if (data.sites && data.sites.length > 0) {
        step = 4;
      } else if (data.bankDetails) {
        step = 4;
      } else if (data.directors && data.directors.length > 0) {
        step = 3;
      } else {
        step = 2;
      }

      setFullState({
        businessId: data.id,
        status: data.status,
        businessBasics: basics,
        directors: directors,
        storeInformation: StoreInformation as any,
        bankDetails: bankDetails,
        currentStep: step,
      });

      toast.info(`Continuing setup for ${data.name}`);
      router.push("/setup-business");
    } catch (error) {
      console.error("Failed to load business details:", error);
      toast.error("Failed to load business details");
    }
  };

  if (loading && !viewingBusiness) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // If we are viewing a specific business, show the cards detail view
  if (viewingBusiness) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewingBusiness(null)}
            className="group"
          >
            <ChevronLeft className="size-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to All Businesses
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(viewingBusiness)}
            >
              <Edit2 className="size-4 mr-2" />
              Edit Business
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewingBusiness(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business & Legal Card */}
            <Card className="overflow-hidden border-muted/40 shadow-sm">
              <CardHeader className="bg-muted/5 border-b py-4">
                <SectionHeader icon={Building2} title="Legal Information" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <InfoItem
                    label="Business Name"
                    value={viewingBusiness.name}
                    icon={Building2}
                  />
                  <InfoItem
                    label="Company Name"
                    value={viewingBusiness.companyName}
                    icon={Building2}
                  />
                  <InfoItem
                    label={
                      viewingBusiness.region === "USA"
                        ? "EIN / Tax ID"
                        : "Registration Number"
                    }
                    value={viewingBusiness.registrationNumber}
                    icon={Globe}
                  />
                  <InfoItem
                    label="Business Type"
                    value={viewingBusiness.businessType}
                    icon={Building2}
                  />
                  <InfoItem
                    label="Company Email"
                    value={viewingBusiness.companyEmail}
                    icon={Mail}
                  />
                  <InfoItem
                    label="Company Phone"
                    value={viewingBusiness.companyPhone}
                    icon={Phone}
                  />
                  <div className="md:col-span-2">
                    <InfoItem
                      label="Registered Address"
                      value={`${viewingBusiness.registeredAddress?.street}, ${viewingBusiness.registeredAddress?.locality}, ${viewingBusiness.registeredAddress?.region} ${viewingBusiness.registeredAddress?.postalCode}`}
                      icon={MapPin}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details Card */}
            <Card className="overflow-hidden border-muted/40 shadow-sm">
              <CardHeader className="bg-muted/5 border-b py-4">
                <SectionHeader icon={CreditCard} title="Bank Details" />
              </CardHeader>
              <CardContent className="p-6">
                {viewingBusiness.bankDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <InfoItem
                      label="Account Name"
                      value={viewingBusiness.bankDetails.accountName}
                    />
                    <InfoItem
                      label="Bank Name"
                      value={viewingBusiness.bankDetails.bankName}
                    />
                    {viewingBusiness.bankDetails.accountNumber && (
                      <InfoItem
                        label="Account Number"
                        value={viewingBusiness.bankDetails.accountNumber}
                      />
                    )}
                    {viewingBusiness.bankDetails.sortCode && (
                      <InfoItem
                        label="Sort Code"
                        value={viewingBusiness.bankDetails.sortCode}
                      />
                    )}
                    {viewingBusiness.bankDetails.iban && (
                      <InfoItem
                        label="IBAN"
                        value={viewingBusiness.bankDetails.iban}
                      />
                    )}
                    {viewingBusiness.bankDetails.bic && (
                      <InfoItem
                        label="BIC / SWIFT"
                        value={viewingBusiness.bankDetails.bic}
                      />
                    )}
                    {viewingBusiness.bankDetails.routingNumber && (
                      <InfoItem
                        label="Routing Number"
                        value={viewingBusiness.bankDetails.routingNumber}
                      />
                    )}
                    {viewingBusiness.bankDetails.ifscCode && (
                      <InfoItem
                        label="IFSC Code"
                        value={viewingBusiness.bankDetails.ifscCode}
                      />
                    )}
                    {viewingBusiness.bankDetails.bsbNumber && (
                      <InfoItem
                        label="BSB Number"
                        value={viewingBusiness.bankDetails.bsbNumber}
                      />
                    )}
                    {viewingBusiness.bankDetails.transitNumber && (
                      <InfoItem
                        label="Transit Number"
                        value={viewingBusiness.bankDetails.transitNumber}
                      />
                    )}
                    {viewingBusiness.bankDetails.institutionNumber && (
                      <InfoItem
                        label="Institution Number"
                        value={viewingBusiness.bankDetails.institutionNumber}
                      />
                    )}
                    {viewingBusiness.bankDetails.accountType && (
                      <InfoItem
                        label="Account Type"
                        value={viewingBusiness.bankDetails.accountType}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                    <CreditCard className="size-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">
                      No bank details provided
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sites Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <h3 className="font-bold text-lg">Business Sites</h3>
              </div>

              {viewingBusiness.sites && viewingBusiness.sites.length > 0 ? (
                viewingBusiness.sites.map((site: any) => (
                  <Card
                    key={site.id}
                    className="overflow-hidden border-muted/40 shadow-sm"
                  >
                    <CardHeader className="bg-muted/5 border-b py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-primary" />
                          <h4 className="font-bold">{site.name}</h4>
                        </div>
                        <Badge variant="outline" className="bg-background">
                          {site.businessType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Address & Basics */}
                        <div className="space-y-4">
                          <InfoItem
                            label="Address"
                            value={`${site.siteAddress?.street}, ${site.siteAddress?.locality}, ${site.siteAddress?.region} ${site.siteAddress?.postalCode}`}
                            icon={MapPin}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <InfoItem label="Currency" value={site.currency} />
                            <InfoItem
                              label="24/7 Ops"
                              value={site.is_24_7 ? "Yes" : "No"}
                            />
                          </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="space-y-3">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            Operating Hours
                          </p>
                          <div className="space-y-1.5">
                            {site.operatingHours?.map((h: any) => (
                              <div
                                key={h.day}
                                className="flex items-center justify-between text-xs font-medium"
                              >
                                <span className="text-muted-foreground">
                                  {h.day}
                                </span>
                                <div className="flex-1 border-b border-dotted mx-2 opacity-20" />
                                <span>
                                  {h.open_time} - {h.close_time}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Holidays */}
                        <div className="space-y-3">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            Upcoming Holidays
                          </p>
                          <div className="space-y-2">
                            {site.holidays && site.holidays.length > 0 ? (
                              site.holidays.map((h: any) => (
                                <div
                                  key={h.id}
                                  className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg border border-muted/50"
                                >
                                  <Calendar className="size-3 text-primary mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold truncate leading-none mb-1">
                                      {h.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {format(new Date(h.date), "MMM dd, yyyy")}
                                    </p>
                                    <p className="text-[10px] font-medium text-primary mt-0.5">
                                      {h.is_closed
                                        ? "Closed"
                                        : `${h.open_time} - ${h.close_time}`}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                No holidays configured
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed">
                  <MapPin className="size-10 mb-2 opacity-20" />
                  <p className="font-medium">No sites added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Info - Directors */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <h3 className="font-bold text-lg">Directors & Owners</h3>
            </div>

            {viewingBusiness.directors &&
            viewingBusiness.directors.length > 0 ? (
              viewingBusiness.directors.map((d: any) => (
                <Card
                  key={d.id}
                  className="overflow-hidden border-muted/40 transition-colors"
                >
                  <CardHeader className="bg-primary/5 border-b py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {d.firstName[0]}
                        {d.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          {d.firstName} {d.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-widest">
                          Director
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <InfoItem label="Email" value={d.email} icon={Mail} />
                      <InfoItem label="Phone" value={d.phone} icon={Phone} />
                      <InfoItem
                        label="DOB"
                        value={
                          d.dob ? format(new Date(d.dob), "dd MMM yyyy") : "N/A"
                        }
                        icon={Calendar}
                      />
                      <InfoItem
                        label="Address"
                        value={`${d.residentialAddress?.street}, ${d.residentialAddress?.locality}, ${d.residentialAddress?.postalCode}`}
                        icon={MapPin}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed">
                <Users className="size-10 mb-2 opacity-20" />
                <p className="font-medium">No directors added</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border-2 border-dashed">
            <Building2 className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-bold">No businesses found</h3>
            <p className="text-muted-foreground mb-6">
              Start your first setup to manage your business here.
            </p>
            <Button
              onClick={() => {
                useSetupBusinessStore.getState().reset();
                router.push("/setup-business");
              }}
            >
              + Add Business
            </Button>
          </div>
        ) : (
          businesses.map((business) => (
            <Card
              key={business.id}
              className="group overflow-hidden border-muted/40 hover:border-border transition-all"
            >
              <CardHeader className="pb-3 border-b bg-muted/5 group-hover:bg-primary/5 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                      {business.name || "Unnamed Business"}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant={
                          business.status === "SAVED" ? "default" : "secondary"
                        }
                        className="text-[10px] h-4"
                      >
                        {business.status === "SAVED" ? "Saved" : "Draft"}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-[10px] h-4",
                          business.status === "SUBMITTED"
                            ? "bg-foreground text-background"
                            : business.status === "PENDING"
                              ? "bg-muted text-muted-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {business.status === "SUBMITTED"
                          ? "Submitted"
                          : business.status === "PENDING"
                            ? "Pending"
                            : "Not Submitted"}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-background border shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="size-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    <span>
                      Created:{" "}
                      {format(new Date(business.createdAt), "dd MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>{format(new Date(business.updatedAt), "HH:mm")}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 bg-muted/5 flex justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => handleEdit(business)}
                >
                  <Edit2 className="size-3.5 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleView(business)}
                >
                  <Eye className="size-3.5 mr-2" />
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={page === i + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(i + 1);
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
