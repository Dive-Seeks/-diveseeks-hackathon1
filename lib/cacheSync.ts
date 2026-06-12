import { socket } from "./socket";
import { queryClient } from "@/providers/query-client";

export const initCacheSync = () => {
  console.log("Initializing Cache Sync Engine...");

  // ======================
  // SALE CREATED EVENT
  // ======================
  socket.on("sale_created", (newSale: any) => {
    queryClient.setQueryData(["sales", newSale.siteId], (old: any[] = []) => {
      return [newSale, ...old];
    });
  });

  // ======================
  // INVENTORY UPDATED
  // ======================
  socket.on("inventory_updated", (update: any) => {
    queryClient.setQueryData(
      ["inventory", update.siteId],
      (old: any[] = []) => {
        return old.map((item) =>
          item.productId === update.productId
            ? { ...item, quantity: update.quantity }
            : item,
        );
      },
    );
  });

  // ======================
  // PRODUCT EVENTS
  // ======================
  socket.on("product_created", (newProduct: any) => {
    queryClient.invalidateQueries({
      queryKey: ["products", newProduct.siteId],
    });
  });

  socket.on("product_updated", (product: any) => {
    queryClient.setQueryData(
      ["products", product.siteId],
      (old: any[] = []) => {
        if (!Array.isArray(old)) return [product];
        return old.map((p) => (p.id === product.id ? product : p));
      },
    );
  });

  socket.on(
    "product_deleted",
    ({ id, siteId }: { id: string; siteId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["products", siteId] });
    },
  );

  // ======================
  // EMPLOYEE EVENTS
  // ======================
  socket.on("employee_created", (newEmployee: any) => {
    queryClient.invalidateQueries({
      queryKey: ["employees", newEmployee.businessId],
    });
  });

  socket.on("employee_updated", (employee: any) => {
    queryClient.invalidateQueries({
      queryKey: ["employees", employee.businessId],
    });
  });

  socket.on(
    "employee_deleted",
    ({ id, businessId }: { id: string; businessId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["employees", businessId] });
    },
  );

  // ======================
  // DEPARTMENT EVENTS
  // ======================
  socket.on("department_created", (newDept: any) => {
    queryClient.invalidateQueries({
      queryKey: ["departments", newDept.siteId],
    });
  });

  socket.on("department_updated", (dept: any) => {
    queryClient.invalidateQueries({ queryKey: ["departments", dept.siteId] });
  });

  socket.on(
    "department_deleted",
    ({ id, siteId }: { id: string; siteId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["departments", siteId] });
    },
  );

  // ======================
  // BUSINESS UPDATED
  // ======================
  socket.on("business_updated", (updatedBusiness: any) => {
    queryClient.invalidateQueries({ queryKey: ["businesses"] });
  });

  // ======================
  // SITE UPDATED EVENT
  // ======================
  socket.on("site_updated", (updatedSite: any) => {
    queryClient.invalidateQueries({ queryKey: ["sites"] });
  });

  // ======================
  // BUSINESS CREATED
  // ======================
  socket.on("business_created", (newBusiness: any) => {
    queryClient.invalidateQueries({ queryKey: ["businesses"] });
  });

  // ======================
  // STORE RECORDS
  // ======================
  socket.on("store_record_updated", () => {
    queryClient.invalidateQueries({ queryKey: ["store-records"] });
  });

  // ======================
  // MENU IMAGE EVENTS
  // ======================
  socket.on("menu_image_generated", (payload: any) => {
    if (payload.tenantId) {
      queryClient.invalidateQueries({ queryKey: ["menu-images", payload.tenantId] });
    }
    if (payload.imageId) {
      queryClient.invalidateQueries({ queryKey: ["menu-images", payload.imageId, "status"] });
    }
  });

  socket.on("menu_image_failed", (payload: any) => {
    if (payload.tenantId) {
      queryClient.invalidateQueries({ queryKey: ["menu-images", payload.tenantId] });
    }
    if (payload.imageId) {
      queryClient.invalidateQueries({ queryKey: ["menu-images", payload.imageId, "status"] });
    }
  });

  // Handle connection events
  socket.on("connect", () => {
    console.log("WebSocket connected. Cache sync active.");
  });

  socket.on("disconnect", () => {
    console.warn("WebSocket disconnected. Cache sync paused.");
  });
};
