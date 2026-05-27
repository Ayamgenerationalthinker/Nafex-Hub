import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AssignRiderBody, AuthResponse, Business, BusinessAnalytics, CategoryCount, ChangePassword200, ChangePasswordBody, Collection, CollectionWithProducts, ConversationWithDetails, CreateBusinessBody, CreateCollectionBody, CreateConversationBody, CreateDeliveryBody, CreateDisputeBody, CreateOrderBody, CreateProductBody, CreateReviewBody, CreateRiderBody, DashboardStats, DeleteAccount200, DeliveryWithDetails, Dispute, ErrorResponse, FavoriteToggleBody, FavoritesResponse, FeeEstimate, GetAdminBusinessesParams, GetBusinessesParams, GetCollectionsParams, GetDeliveryFeeEstimateParams, HealthStatus, InitiatePaymentBody, ListProductsParams, LoginBody, Message, Notification, OkResponse, Order, OrderWithBusiness, PaystackInitResponse, PaystackVerifyResponse, ProcessRefundBody, Product, RegisterBody, ResolveDisputeBody, Review, Rider, SendMessageBody, StatsSummary, ToggleFavorite200, TrackEventBody, Transaction, UnreadCountResponse, UpdateBusinessBody, UpdateCollectionBody, UpdateDeliveryStatusBody, UpdateOrderStatusBody, UpdateProductCollectionBody, UpdateProfileBody, UpdateRiderBody, UpdateStockBody, User, VerifyBusinessBody, VerifyPaymentBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Register a new user
 */
export declare const getRegisterUrl: () => string;
export declare const register: (registerBody: RegisterBody, options?: RequestInit) => Promise<AuthResponse>;
export declare const getRegisterMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterBody>;
}, TContext>;
export type RegisterMutationResult = NonNullable<Awaited<ReturnType<typeof register>>>;
export type RegisterMutationBody = BodyType<RegisterBody>;
export type RegisterMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Register a new user
 */
export declare const useRegister: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterBody>;
}, TContext>;
/**
 * @summary Login a user
 */
export declare const getLoginUrl: () => string;
export declare const login: (loginBody: LoginBody, options?: RequestInit) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginBody>;
export type LoginMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Login a user
 */
export declare const useLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginBody>;
}, TContext>;
/**
 * @summary Get current user
 */
export declare const getGetMeUrl: () => string;
export declare const getMe: (options?: RequestInit) => Promise<User>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get current user
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update user profile (name)
 */
export declare const getUpdateProfileUrl: () => string;
export declare const updateProfile: (updateProfileBody: UpdateProfileBody, options?: RequestInit) => Promise<User>;
export declare const getUpdateProfileMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProfile>>, TError, {
        data: BodyType<UpdateProfileBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProfile>>, TError, {
    data: BodyType<UpdateProfileBody>;
}, TContext>;
export type UpdateProfileMutationResult = NonNullable<Awaited<ReturnType<typeof updateProfile>>>;
export type UpdateProfileMutationBody = BodyType<UpdateProfileBody>;
export type UpdateProfileMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update user profile (name)
 */
export declare const useUpdateProfile: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProfile>>, TError, {
        data: BodyType<UpdateProfileBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProfile>>, TError, {
    data: BodyType<UpdateProfileBody>;
}, TContext>;
/**
 * @summary Change user password
 */
export declare const getChangePasswordUrl: () => string;
export declare const changePassword: (changePasswordBody: ChangePasswordBody, options?: RequestInit) => Promise<ChangePassword200>;
export declare const getChangePasswordMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof changePassword>>, TError, {
        data: BodyType<ChangePasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof changePassword>>, TError, {
    data: BodyType<ChangePasswordBody>;
}, TContext>;
export type ChangePasswordMutationResult = NonNullable<Awaited<ReturnType<typeof changePassword>>>;
export type ChangePasswordMutationBody = BodyType<ChangePasswordBody>;
export type ChangePasswordMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Change user password
 */
export declare const useChangePassword: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof changePassword>>, TError, {
        data: BodyType<ChangePasswordBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof changePassword>>, TError, {
    data: BodyType<ChangePasswordBody>;
}, TContext>;
/**
 * @summary Delete user account permanently
 */
export declare const getDeleteAccountUrl: () => string;
export declare const deleteAccount: (options?: RequestInit) => Promise<DeleteAccount200>;
export declare const getDeleteAccountMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, void, TContext>;
export type DeleteAccountMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAccount>>>;
export type DeleteAccountMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete user account permanently
 */
export declare const useDeleteAccount: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAccount>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAccount>>, TError, void, TContext>;
/**
 * @summary List all businesses
 */
export declare const getGetBusinessesUrl: (params?: GetBusinessesParams) => string;
export declare const getBusinesses: (params?: GetBusinessesParams, options?: RequestInit) => Promise<Business[]>;
export declare const getGetBusinessesQueryKey: (params?: GetBusinessesParams) => readonly ["/api/businesses", ...GetBusinessesParams[]];
export declare const getGetBusinessesQueryOptions: <TData = Awaited<ReturnType<typeof getBusinesses>>, TError = ErrorType<unknown>>(params?: GetBusinessesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusinesses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessesQueryResult = NonNullable<Awaited<ReturnType<typeof getBusinesses>>>;
export type GetBusinessesQueryError = ErrorType<unknown>;
/**
 * @summary List all businesses
 */
export declare function useGetBusinesses<TData = Awaited<ReturnType<typeof getBusinesses>>, TError = ErrorType<unknown>>(params?: GetBusinessesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new business listing
 */
export declare const getCreateBusinessUrl: () => string;
export declare const createBusiness: (createBusinessBody: CreateBusinessBody, options?: RequestInit) => Promise<Business>;
export declare const getCreateBusinessMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBusiness>>, TError, {
        data: BodyType<CreateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBusiness>>, TError, {
    data: BodyType<CreateBusinessBody>;
}, TContext>;
export type CreateBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof createBusiness>>>;
export type CreateBusinessMutationBody = BodyType<CreateBusinessBody>;
export type CreateBusinessMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Create a new business listing
 */
export declare const useCreateBusiness: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBusiness>>, TError, {
        data: BodyType<CreateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBusiness>>, TError, {
    data: BodyType<CreateBusinessBody>;
}, TContext>;
/**
 * @summary Get homepage_section featured businesses
 */
export declare const getGetFeaturedBusinessesUrl: () => string;
export declare const getFeaturedBusinesses: (options?: RequestInit) => Promise<Business[]>;
export declare const getGetFeaturedBusinessesQueryKey: () => readonly ["/api/businesses/featured"];
export declare const getGetFeaturedBusinessesQueryOptions: <TData = Awaited<ReturnType<typeof getFeaturedBusinesses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeaturedBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFeaturedBusinesses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFeaturedBusinessesQueryResult = NonNullable<Awaited<ReturnType<typeof getFeaturedBusinesses>>>;
export type GetFeaturedBusinessesQueryError = ErrorType<unknown>;
/**
 * @summary Get homepage_section featured businesses
 */
export declare function useGetFeaturedBusinesses<TData = Awaited<ReturnType<typeof getFeaturedBusinesses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeaturedBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get homepage_top featured businesses
 */
export declare const getGetFeaturedTopBusinessesUrl: () => string;
export declare const getFeaturedTopBusinesses: (options?: RequestInit) => Promise<Business[]>;
export declare const getGetFeaturedTopBusinessesQueryKey: () => readonly ["/api/businesses/featured-top"];
export declare const getGetFeaturedTopBusinessesQueryOptions: <TData = Awaited<ReturnType<typeof getFeaturedTopBusinesses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeaturedTopBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFeaturedTopBusinesses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFeaturedTopBusinessesQueryResult = NonNullable<Awaited<ReturnType<typeof getFeaturedTopBusinesses>>>;
export type GetFeaturedTopBusinessesQueryError = ErrorType<unknown>;
/**
 * @summary Get homepage_top featured businesses
 */
export declare function useGetFeaturedTopBusinesses<TData = Awaited<ReturnType<typeof getFeaturedTopBusinesses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFeaturedTopBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a single business by ID
 */
export declare const getGetBusinessUrl: (id: number) => string;
export declare const getBusiness: (id: number, options?: RequestInit) => Promise<Business>;
export declare const getGetBusinessQueryKey: (id: number) => readonly [`/api/businesses/${number}`];
export declare const getGetBusinessQueryOptions: <TData = Awaited<ReturnType<typeof getBusiness>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusiness>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusiness>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessQueryResult = NonNullable<Awaited<ReturnType<typeof getBusiness>>>;
export type GetBusinessQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a single business by ID
 */
export declare function useGetBusiness<TData = Awaited<ReturnType<typeof getBusiness>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusiness>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a business listing
 */
export declare const getUpdateBusinessUrl: (id: number) => string;
export declare const updateBusiness: (id: number, updateBusinessBody: UpdateBusinessBody, options?: RequestInit) => Promise<Business>;
export declare const getUpdateBusinessMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBusiness>>, TError, {
        id: number;
        data: BodyType<UpdateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateBusiness>>, TError, {
    id: number;
    data: BodyType<UpdateBusinessBody>;
}, TContext>;
export type UpdateBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof updateBusiness>>>;
export type UpdateBusinessMutationBody = BodyType<UpdateBusinessBody>;
export type UpdateBusinessMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update a business listing
 */
export declare const useUpdateBusiness: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateBusiness>>, TError, {
        id: number;
        data: BodyType<UpdateBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateBusiness>>, TError, {
    id: number;
    data: BodyType<UpdateBusinessBody>;
}, TContext>;
/**
 * @summary Delete a business listing
 */
export declare const getDeleteBusinessUrl: (id: number) => string;
export declare const deleteBusiness: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteBusinessMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
    id: number;
}, TContext>;
export type DeleteBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBusiness>>>;
export type DeleteBusinessMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a business listing
 */
export declare const useDeleteBusiness: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBusiness>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Admin - verify/unverify a business
 */
export declare const getVerifyBusinessUrl: (id: number) => string;
export declare const verifyBusiness: (id: number, verifyBusinessBody: VerifyBusinessBody, options?: RequestInit) => Promise<Business>;
export declare const getVerifyBusinessMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyBusiness>>, TError, {
        id: number;
        data: BodyType<VerifyBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyBusiness>>, TError, {
    id: number;
    data: BodyType<VerifyBusinessBody>;
}, TContext>;
export type VerifyBusinessMutationResult = NonNullable<Awaited<ReturnType<typeof verifyBusiness>>>;
export type VerifyBusinessMutationBody = BodyType<VerifyBusinessBody>;
export type VerifyBusinessMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Admin - verify/unverify a business
 */
export declare const useVerifyBusiness: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyBusiness>>, TError, {
        id: number;
        data: BodyType<VerifyBusinessBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyBusiness>>, TError, {
    id: number;
    data: BodyType<VerifyBusinessBody>;
}, TContext>;
/**
 * @summary Get all categories with counts
 */
export declare const getGetCategoriesUrl: () => string;
export declare const getCategories: (options?: RequestInit) => Promise<CategoryCount[]>;
export declare const getGetCategoriesQueryKey: () => readonly ["/api/categories"];
export declare const getGetCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof getCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof getCategories>>>;
export type GetCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary Get all categories with counts
 */
export declare function useGetCategories<TData = Awaited<ReturnType<typeof getCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get platform summary statistics
 */
export declare const getGetStatsSummaryUrl: () => string;
export declare const getStatsSummary: (options?: RequestInit) => Promise<StatsSummary>;
export declare const getGetStatsSummaryQueryKey: () => readonly ["/api/stats/summary"];
export declare const getGetStatsSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getStatsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStatsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStatsSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStatsSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getStatsSummary>>>;
export type GetStatsSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get platform summary statistics
 */
export declare function useGetStatsSummary<TData = Awaited<ReturnType<typeof getStatsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStatsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Admin - get all businesses including unverified
 */
export declare const getGetAdminBusinessesUrl: (params?: GetAdminBusinessesParams) => string;
export declare const getAdminBusinesses: (params?: GetAdminBusinessesParams, options?: RequestInit) => Promise<Business[]>;
export declare const getGetAdminBusinessesQueryKey: (params?: GetAdminBusinessesParams) => readonly ["/api/admin/businesses", ...GetAdminBusinessesParams[]];
export declare const getGetAdminBusinessesQueryOptions: <TData = Awaited<ReturnType<typeof getAdminBusinesses>>, TError = ErrorType<unknown>>(params?: GetAdminBusinessesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminBusinesses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminBusinessesQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminBusinesses>>>;
export type GetAdminBusinessesQueryError = ErrorType<unknown>;
/**
 * @summary Admin - get all businesses including unverified
 */
export declare function useGetAdminBusinesses<TData = Awaited<ReturnType<typeof getAdminBusinesses>>, TError = ErrorType<unknown>>(params?: GetAdminBusinessesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminBusinesses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get reviews for a business
 */
export declare const getGetBusinessReviewsUrl: (id: number) => string;
export declare const getBusinessReviews: (id: number, options?: RequestInit) => Promise<Review[]>;
export declare const getGetBusinessReviewsQueryKey: (id: number) => readonly [`/api/businesses/${number}/reviews`];
export declare const getGetBusinessReviewsQueryOptions: <TData = Awaited<ReturnType<typeof getBusinessReviews>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusinessReviews>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessReviewsQueryResult = NonNullable<Awaited<ReturnType<typeof getBusinessReviews>>>;
export type GetBusinessReviewsQueryError = ErrorType<unknown>;
/**
 * @summary Get reviews for a business
 */
export declare function useGetBusinessReviews<TData = Awaited<ReturnType<typeof getBusinessReviews>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a review for a business
 */
export declare const getCreateReviewUrl: () => string;
export declare const createReview: (createReviewBody: CreateReviewBody, options?: RequestInit) => Promise<Review>;
export declare const getCreateReviewMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReview>>, TError, {
        data: BodyType<CreateReviewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createReview>>, TError, {
    data: BodyType<CreateReviewBody>;
}, TContext>;
export type CreateReviewMutationResult = NonNullable<Awaited<ReturnType<typeof createReview>>>;
export type CreateReviewMutationBody = BodyType<CreateReviewBody>;
export type CreateReviewMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Create a review for a business
 */
export declare const useCreateReview: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReview>>, TError, {
        data: BodyType<CreateReviewBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createReview>>, TError, {
    data: BodyType<CreateReviewBody>;
}, TContext>;
/**
 * @summary Get all conversations for the current user
 */
export declare const getGetConversationsUrl: () => string;
export declare const getConversations: (options?: RequestInit) => Promise<ConversationWithDetails[]>;
export declare const getGetConversationsQueryKey: () => readonly ["/api/conversations"];
export declare const getGetConversationsQueryOptions: <TData = Awaited<ReturnType<typeof getConversations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getConversations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetConversationsQueryResult = NonNullable<Awaited<ReturnType<typeof getConversations>>>;
export type GetConversationsQueryError = ErrorType<unknown>;
/**
 * @summary Get all conversations for the current user
 */
export declare function useGetConversations<TData = Awaited<ReturnType<typeof getConversations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Start or retrieve a conversation with a business
 */
export declare const getCreateOrGetConversationUrl: () => string;
export declare const createOrGetConversation: (createConversationBody: CreateConversationBody, options?: RequestInit) => Promise<ConversationWithDetails>;
export declare const getCreateOrGetConversationMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrGetConversation>>, TError, {
        data: BodyType<CreateConversationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOrGetConversation>>, TError, {
    data: BodyType<CreateConversationBody>;
}, TContext>;
export type CreateOrGetConversationMutationResult = NonNullable<Awaited<ReturnType<typeof createOrGetConversation>>>;
export type CreateOrGetConversationMutationBody = BodyType<CreateConversationBody>;
export type CreateOrGetConversationMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Start or retrieve a conversation with a business
 */
export declare const useCreateOrGetConversation: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrGetConversation>>, TError, {
        data: BodyType<CreateConversationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOrGetConversation>>, TError, {
    data: BodyType<CreateConversationBody>;
}, TContext>;
/**
 * @summary Get messages in a conversation
 */
export declare const getGetMessagesUrl: (id: number) => string;
export declare const getMessages: (id: number, options?: RequestInit) => Promise<Message[]>;
export declare const getGetMessagesQueryKey: (id: number) => readonly [`/api/conversations/${number}/messages`];
export declare const getGetMessagesQueryOptions: <TData = Awaited<ReturnType<typeof getMessages>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof getMessages>>>;
export type GetMessagesQueryError = ErrorType<unknown>;
/**
 * @summary Get messages in a conversation
 */
export declare function useGetMessages<TData = Awaited<ReturnType<typeof getMessages>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Send a message in a conversation
 */
export declare const getSendMessageUrl: (id: number) => string;
export declare const sendMessage: (id: number, sendMessageBody: SendMessageBody, options?: RequestInit) => Promise<Message>;
export declare const getSendMessageMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        id: number;
        data: BodyType<SendMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
    id: number;
    data: BodyType<SendMessageBody>;
}, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = BodyType<SendMessageBody>;
export type SendMessageMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Send a message in a conversation
 */
export declare const useSendMessage: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        id: number;
        data: BodyType<SendMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, {
    id: number;
    data: BodyType<SendMessageBody>;
}, TContext>;
/**
 * @summary Place an order
 */
export declare const getCreateOrderUrl: () => string;
export declare const createOrder: (createOrderBody: CreateOrderBody, options?: RequestInit) => Promise<Order>;
export declare const getCreateOrderMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<CreateOrderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<CreateOrderBody>;
}, TContext>;
export type CreateOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createOrder>>>;
export type CreateOrderMutationBody = BodyType<CreateOrderBody>;
export type CreateOrderMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Place an order
 */
export declare const useCreateOrder: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrder>>, TError, {
        data: BodyType<CreateOrderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOrder>>, TError, {
    data: BodyType<CreateOrderBody>;
}, TContext>;
/**
 * @summary Get orders for the current user
 */
export declare const getGetUserOrdersUrl: () => string;
export declare const getUserOrders: (options?: RequestInit) => Promise<OrderWithBusiness[]>;
export declare const getGetUserOrdersQueryKey: () => readonly ["/api/orders/user"];
export declare const getGetUserOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getUserOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getUserOrders>>>;
export type GetUserOrdersQueryError = ErrorType<unknown>;
/**
 * @summary Get orders for the current user
 */
export declare function useGetUserOrders<TData = Awaited<ReturnType<typeof getUserOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get orders for the current business owner
 */
export declare const getGetBusinessOrdersUrl: () => string;
export declare const getBusinessOrders: (options?: RequestInit) => Promise<OrderWithBusiness[]>;
export declare const getGetBusinessOrdersQueryKey: () => readonly ["/api/orders/business"];
export declare const getGetBusinessOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getBusinessOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusinessOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getBusinessOrders>>>;
export type GetBusinessOrdersQueryError = ErrorType<unknown>;
/**
 * @summary Get orders for the current business owner
 */
export declare function useGetBusinessOrders<TData = Awaited<ReturnType<typeof getBusinessOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update order status
 */
export declare const getUpdateOrderStatusUrl: (id: number) => string;
export declare const updateOrderStatus: (id: number, updateOrderStatusBody: UpdateOrderStatusBody, options?: RequestInit) => Promise<Order>;
export declare const getUpdateOrderStatusMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<UpdateOrderStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<UpdateOrderStatusBody>;
}, TContext>;
export type UpdateOrderStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateOrderStatus>>>;
export type UpdateOrderStatusMutationBody = BodyType<UpdateOrderStatusBody>;
export type UpdateOrderStatusMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update order status
 */
export declare const useUpdateOrderStatus: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
        id: number;
        data: BodyType<UpdateOrderStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateOrderStatus>>, TError, {
    id: number;
    data: BodyType<UpdateOrderStatusBody>;
}, TContext>;
/**
 * @summary Track an analytics event
 */
export declare const getTrackEventUrl: () => string;
export declare const trackEvent: (trackEventBody: TrackEventBody, options?: RequestInit) => Promise<OkResponse>;
export declare const getTrackEventMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof trackEvent>>, TError, {
        data: BodyType<TrackEventBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof trackEvent>>, TError, {
    data: BodyType<TrackEventBody>;
}, TContext>;
export type TrackEventMutationResult = NonNullable<Awaited<ReturnType<typeof trackEvent>>>;
export type TrackEventMutationBody = BodyType<TrackEventBody>;
export type TrackEventMutationError = ErrorType<unknown>;
/**
 * @summary Track an analytics event
 */
export declare const useTrackEvent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof trackEvent>>, TError, {
        data: BodyType<TrackEventBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof trackEvent>>, TError, {
    data: BodyType<TrackEventBody>;
}, TContext>;
/**
 * @summary Get analytics for a business
 */
export declare const getGetBusinessAnalyticsUrl: (businessId: number) => string;
export declare const getBusinessAnalytics: (businessId: number, options?: RequestInit) => Promise<BusinessAnalytics>;
export declare const getGetBusinessAnalyticsQueryKey: (businessId: number) => readonly [`/api/analytics/business/${number}`];
export declare const getGetBusinessAnalyticsQueryOptions: <TData = Awaited<ReturnType<typeof getBusinessAnalytics>>, TError = ErrorType<unknown>>(businessId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusinessAnalytics>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessAnalyticsQueryResult = NonNullable<Awaited<ReturnType<typeof getBusinessAnalytics>>>;
export type GetBusinessAnalyticsQueryError = ErrorType<unknown>;
/**
 * @summary Get analytics for a business
 */
export declare function useGetBusinessAnalytics<TData = Awaited<ReturnType<typeof getBusinessAnalytics>>, TError = ErrorType<unknown>>(businessId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessAnalytics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get seller dashboard statistics
 */
export declare const getGetDashboardStatsUrl: () => string;
export declare const getDashboardStats: (options?: RequestInit) => Promise<DashboardStats>;
export declare const getGetDashboardStatsQueryKey: () => readonly ["/api/dashboard/stats"];
export declare const getGetDashboardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>;
export type GetDashboardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get seller dashboard statistics
 */
export declare function useGetDashboardStats<TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List products with optional search
 */
export declare const getListProductsUrl: (params?: ListProductsParams) => string;
export declare const listProducts: (params?: ListProductsParams, options?: RequestInit) => Promise<Product[]>;
export declare const getListProductsQueryKey: (params?: ListProductsParams) => readonly ["/api/products", ...ListProductsParams[]];
export declare const getListProductsQueryOptions: <TData = Awaited<ReturnType<typeof listProducts>>, TError = ErrorType<unknown>>(params?: ListProductsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProductsQueryResult = NonNullable<Awaited<ReturnType<typeof listProducts>>>;
export type ListProductsQueryError = ErrorType<unknown>;
/**
 * @summary List products with optional search
 */
export declare function useListProducts<TData = Awaited<ReturnType<typeof listProducts>>, TError = ErrorType<unknown>>(params?: ListProductsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get product by ID
 */
export declare const getGetProductUrl: (id: number) => string;
export declare const getProduct: (id: number, options?: RequestInit) => Promise<Product>;
export declare const getGetProductQueryKey: (id: number) => readonly [`/api/products/${number}`];
export declare const getGetProductQueryOptions: <TData = Awaited<ReturnType<typeof getProduct>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProduct>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProduct>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProductQueryResult = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
export type GetProductQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get product by ID
 */
export declare function useGetProduct<TData = Awaited<ReturnType<typeof getProduct>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProduct>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a product
 */
export declare const getUpdateProductUrl: (id: number) => string;
export declare const updateProduct: (id: number, createProductBody: CreateProductBody, options?: RequestInit) => Promise<Product>;
export declare const getUpdateProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProduct>>, TError, {
        id: number;
        data: BodyType<CreateProductBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProduct>>, TError, {
    id: number;
    data: BodyType<CreateProductBody>;
}, TContext>;
export type UpdateProductMutationResult = NonNullable<Awaited<ReturnType<typeof updateProduct>>>;
export type UpdateProductMutationBody = BodyType<CreateProductBody>;
export type UpdateProductMutationError = ErrorType<unknown>;
/**
 * @summary Update a product
 */
export declare const useUpdateProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProduct>>, TError, {
        id: number;
        data: BodyType<CreateProductBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProduct>>, TError, {
    id: number;
    data: BodyType<CreateProductBody>;
}, TContext>;
/**
 * @summary Delete a product
 */
export declare const getDeleteProductUrl: (id: number) => string;
export declare const deleteProduct: (id: number, options?: RequestInit) => Promise<OkResponse>;
export declare const getDeleteProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProduct>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProduct>>, TError, {
    id: number;
}, TContext>;
export type DeleteProductMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProduct>>>;
export type DeleteProductMutationError = ErrorType<unknown>;
/**
 * @summary Delete a product
 */
export declare const useDeleteProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProduct>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProduct>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Assign or remove a product from a collection
 */
export declare const getUpdateProductCollectionUrl: (id: number) => string;
export declare const updateProductCollection: (id: number, updateProductCollectionBody: UpdateProductCollectionBody, options?: RequestInit) => Promise<Product>;
export declare const getUpdateProductCollectionMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProductCollection>>, TError, {
        id: number;
        data: BodyType<UpdateProductCollectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProductCollection>>, TError, {
    id: number;
    data: BodyType<UpdateProductCollectionBody>;
}, TContext>;
export type UpdateProductCollectionMutationResult = NonNullable<Awaited<ReturnType<typeof updateProductCollection>>>;
export type UpdateProductCollectionMutationBody = BodyType<UpdateProductCollectionBody>;
export type UpdateProductCollectionMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Assign or remove a product from a collection
 */
export declare const useUpdateProductCollection: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProductCollection>>, TError, {
        id: number;
        data: BodyType<UpdateProductCollectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProductCollection>>, TError, {
    id: number;
    data: BodyType<UpdateProductCollectionBody>;
}, TContext>;
/**
 * @summary Update stock level for a product
 */
export declare const getUpdateProductStockUrl: (id: number) => string;
export declare const updateProductStock: (id: number, updateStockBody: UpdateStockBody, options?: RequestInit) => Promise<Product>;
export declare const getUpdateProductStockMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProductStock>>, TError, {
        id: number;
        data: BodyType<UpdateStockBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProductStock>>, TError, {
    id: number;
    data: BodyType<UpdateStockBody>;
}, TContext>;
export type UpdateProductStockMutationResult = NonNullable<Awaited<ReturnType<typeof updateProductStock>>>;
export type UpdateProductStockMutationBody = BodyType<UpdateStockBody>;
export type UpdateProductStockMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update stock level for a product
 */
export declare const useUpdateProductStock: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProductStock>>, TError, {
        id: number;
        data: BodyType<UpdateStockBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProductStock>>, TError, {
    id: number;
    data: BodyType<UpdateStockBody>;
}, TContext>;
/**
 * @summary Get products for a business
 */
export declare const getGetBusinessProductsUrl: (businessId: number) => string;
export declare const getBusinessProducts: (businessId: number, options?: RequestInit) => Promise<Product[]>;
export declare const getGetBusinessProductsQueryKey: (businessId: number) => readonly [`/api/businesses/${number}/products`];
export declare const getGetBusinessProductsQueryOptions: <TData = Awaited<ReturnType<typeof getBusinessProducts>>, TError = ErrorType<unknown>>(businessId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBusinessProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBusinessProductsQueryResult = NonNullable<Awaited<ReturnType<typeof getBusinessProducts>>>;
export type GetBusinessProductsQueryError = ErrorType<unknown>;
/**
 * @summary Get products for a business
 */
export declare function useGetBusinessProducts<TData = Awaited<ReturnType<typeof getBusinessProducts>>, TError = ErrorType<unknown>>(businessId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBusinessProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a product for a business
 */
export declare const getCreateProductUrl: (businessId: number) => string;
export declare const createProduct: (businessId: number, createProductBody: CreateProductBody, options?: RequestInit) => Promise<Product>;
export declare const getCreateProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
        businessId: number;
        data: BodyType<CreateProductBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
    businessId: number;
    data: BodyType<CreateProductBody>;
}, TContext>;
export type CreateProductMutationResult = NonNullable<Awaited<ReturnType<typeof createProduct>>>;
export type CreateProductMutationBody = BodyType<CreateProductBody>;
export type CreateProductMutationError = ErrorType<unknown>;
/**
 * @summary Create a product for a business
 */
export declare const useCreateProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
        businessId: number;
        data: BodyType<CreateProductBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProduct>>, TError, {
    businessId: number;
    data: BodyType<CreateProductBody>;
}, TContext>;
/**
 * @summary Get current user's favorites
 */
export declare const getGetFavoritesUrl: () => string;
export declare const getFavorites: (options?: RequestInit) => Promise<FavoritesResponse>;
export declare const getGetFavoritesQueryKey: () => readonly ["/api/favorites"];
export declare const getGetFavoritesQueryOptions: <TData = Awaited<ReturnType<typeof getFavorites>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFavorites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFavorites>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFavoritesQueryResult = NonNullable<Awaited<ReturnType<typeof getFavorites>>>;
export type GetFavoritesQueryError = ErrorType<unknown>;
/**
 * @summary Get current user's favorites
 */
export declare function useGetFavorites<TData = Awaited<ReturnType<typeof getFavorites>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFavorites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Toggle a favorite (add or remove)
 */
export declare const getToggleFavoriteUrl: () => string;
export declare const toggleFavorite: (favoriteToggleBody: FavoriteToggleBody, options?: RequestInit) => Promise<ToggleFavorite200>;
export declare const getToggleFavoriteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleFavorite>>, TError, {
        data: BodyType<FavoriteToggleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof toggleFavorite>>, TError, {
    data: BodyType<FavoriteToggleBody>;
}, TContext>;
export type ToggleFavoriteMutationResult = NonNullable<Awaited<ReturnType<typeof toggleFavorite>>>;
export type ToggleFavoriteMutationBody = BodyType<FavoriteToggleBody>;
export type ToggleFavoriteMutationError = ErrorType<unknown>;
/**
 * @summary Toggle a favorite (add or remove)
 */
export declare const useToggleFavorite: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleFavorite>>, TError, {
        data: BodyType<FavoriteToggleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof toggleFavorite>>, TError, {
    data: BodyType<FavoriteToggleBody>;
}, TContext>;
/**
 * @summary Get current user's notifications
 */
export declare const getGetNotificationsUrl: () => string;
export declare const getNotifications: (options?: RequestInit) => Promise<Notification[]>;
export declare const getGetNotificationsQueryKey: () => readonly ["/api/notifications"];
export declare const getGetNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof getNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof getNotifications>>>;
export type GetNotificationsQueryError = ErrorType<unknown>;
/**
 * @summary Get current user's notifications
 */
export declare function useGetNotifications<TData = Awaited<ReturnType<typeof getNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get unread notification count
 */
export declare const getGetNotificationUnreadCountUrl: () => string;
export declare const getNotificationUnreadCount: (options?: RequestInit) => Promise<UnreadCountResponse>;
export declare const getGetNotificationUnreadCountQueryKey: () => readonly ["/api/notifications/unread-count"];
export declare const getGetNotificationUnreadCountQueryOptions: <TData = Awaited<ReturnType<typeof getNotificationUnreadCount>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotificationUnreadCount>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNotificationUnreadCount>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNotificationUnreadCountQueryResult = NonNullable<Awaited<ReturnType<typeof getNotificationUnreadCount>>>;
export type GetNotificationUnreadCountQueryError = ErrorType<unknown>;
/**
 * @summary Get unread notification count
 */
export declare function useGetNotificationUnreadCount<TData = Awaited<ReturnType<typeof getNotificationUnreadCount>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotificationUnreadCount>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Mark a notification as read
 */
export declare const getMarkNotificationReadUrl: (id: number) => string;
export declare const markNotificationRead: (id: number, options?: RequestInit) => Promise<OkResponse>;
export declare const getMarkNotificationReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export type MarkNotificationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markNotificationRead>>>;
export type MarkNotificationReadMutationError = ErrorType<unknown>;
/**
 * @summary Mark a notification as read
 */
export declare const useMarkNotificationRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Mark all notifications as read
 */
export declare const getMarkAllNotificationsReadUrl: () => string;
export declare const markAllNotificationsRead: (options?: RequestInit) => Promise<OkResponse>;
export declare const getMarkAllNotificationsReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export type MarkAllNotificationsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markAllNotificationsRead>>>;
export type MarkAllNotificationsReadMutationError = ErrorType<unknown>;
/**
 * @summary Mark all notifications as read
 */
export declare const useMarkAllNotificationsRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
/**
 * @summary List collections for a business (with products)
 */
export declare const getGetCollectionsUrl: (params: GetCollectionsParams) => string;
export declare const getCollections: (params: GetCollectionsParams, options?: RequestInit) => Promise<CollectionWithProducts[]>;
export declare const getGetCollectionsQueryKey: (params?: GetCollectionsParams) => readonly ["/api/collections", ...GetCollectionsParams[]];
export declare const getGetCollectionsQueryOptions: <TData = Awaited<ReturnType<typeof getCollections>>, TError = ErrorType<unknown>>(params: GetCollectionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCollections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCollections>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCollectionsQueryResult = NonNullable<Awaited<ReturnType<typeof getCollections>>>;
export type GetCollectionsQueryError = ErrorType<unknown>;
/**
 * @summary List collections for a business (with products)
 */
export declare function useGetCollections<TData = Awaited<ReturnType<typeof getCollections>>, TError = ErrorType<unknown>>(params: GetCollectionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCollections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new collection
 */
export declare const getCreateCollectionUrl: () => string;
export declare const createCollection: (createCollectionBody: CreateCollectionBody, options?: RequestInit) => Promise<Collection>;
export declare const getCreateCollectionMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCollection>>, TError, {
        data: BodyType<CreateCollectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCollection>>, TError, {
    data: BodyType<CreateCollectionBody>;
}, TContext>;
export type CreateCollectionMutationResult = NonNullable<Awaited<ReturnType<typeof createCollection>>>;
export type CreateCollectionMutationBody = BodyType<CreateCollectionBody>;
export type CreateCollectionMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Create a new collection
 */
export declare const useCreateCollection: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCollection>>, TError, {
        data: BodyType<CreateCollectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCollection>>, TError, {
    data: BodyType<CreateCollectionBody>;
}, TContext>;
/**
 * @summary Update a collection
 */
export declare const getUpdateCollectionUrl: (id: number) => string;
export declare const updateCollection: (id: number, updateCollectionBody: UpdateCollectionBody, options?: RequestInit) => Promise<Collection>;
export declare const getUpdateCollectionMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCollection>>, TError, {
        id: number;
        data: BodyType<UpdateCollectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCollection>>, TError, {
    id: number;
    data: BodyType<UpdateCollectionBody>;
}, TContext>;
export type UpdateCollectionMutationResult = NonNullable<Awaited<ReturnType<typeof updateCollection>>>;
export type UpdateCollectionMutationBody = BodyType<UpdateCollectionBody>;
export type UpdateCollectionMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update a collection
 */
export declare const useUpdateCollection: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCollection>>, TError, {
        id: number;
        data: BodyType<UpdateCollectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCollection>>, TError, {
    id: number;
    data: BodyType<UpdateCollectionBody>;
}, TContext>;
/**
 * @summary Delete a collection
 */
export declare const getDeleteCollectionUrl: (id: number) => string;
export declare const deleteCollection: (id: number, options?: RequestInit) => Promise<OkResponse>;
export declare const getDeleteCollectionMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCollection>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCollection>>, TError, {
    id: number;
}, TContext>;
export type DeleteCollectionMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCollection>>>;
export type DeleteCollectionMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a collection
 */
export declare const useDeleteCollection: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCollection>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCollection>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Create delivery for an order
 */
export declare const getCreateDeliveryUrl: () => string;
export declare const createDelivery: (createDeliveryBody: CreateDeliveryBody, options?: RequestInit) => Promise<DeliveryWithDetails>;
export declare const getCreateDeliveryMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDelivery>>, TError, {
        data: BodyType<CreateDeliveryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createDelivery>>, TError, {
    data: BodyType<CreateDeliveryBody>;
}, TContext>;
export type CreateDeliveryMutationResult = NonNullable<Awaited<ReturnType<typeof createDelivery>>>;
export type CreateDeliveryMutationBody = BodyType<CreateDeliveryBody>;
export type CreateDeliveryMutationError = ErrorType<void>;
/**
 * @summary Create delivery for an order
 */
export declare const useCreateDelivery: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDelivery>>, TError, {
        data: BodyType<CreateDeliveryBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createDelivery>>, TError, {
    data: BodyType<CreateDeliveryBody>;
}, TContext>;
/**
 * @summary Get delivery fee estimate for a zone
 */
export declare const getGetDeliveryFeeEstimateUrl: (params?: GetDeliveryFeeEstimateParams) => string;
export declare const getDeliveryFeeEstimate: (params?: GetDeliveryFeeEstimateParams, options?: RequestInit) => Promise<FeeEstimate>;
export declare const getGetDeliveryFeeEstimateQueryKey: (params?: GetDeliveryFeeEstimateParams) => readonly ["/api/deliveries/fee-estimate", ...GetDeliveryFeeEstimateParams[]];
export declare const getGetDeliveryFeeEstimateQueryOptions: <TData = Awaited<ReturnType<typeof getDeliveryFeeEstimate>>, TError = ErrorType<unknown>>(params?: GetDeliveryFeeEstimateParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeliveryFeeEstimate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDeliveryFeeEstimate>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDeliveryFeeEstimateQueryResult = NonNullable<Awaited<ReturnType<typeof getDeliveryFeeEstimate>>>;
export type GetDeliveryFeeEstimateQueryError = ErrorType<unknown>;
/**
 * @summary Get delivery fee estimate for a zone
 */
export declare function useGetDeliveryFeeEstimate<TData = Awaited<ReturnType<typeof getDeliveryFeeEstimate>>, TError = ErrorType<unknown>>(params?: GetDeliveryFeeEstimateParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeliveryFeeEstimate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Public delivery tracking by tracking code
 */
export declare const getTrackDeliveryUrl: (code: string) => string;
export declare const trackDelivery: (code: string, options?: RequestInit) => Promise<DeliveryWithDetails>;
export declare const getTrackDeliveryQueryKey: (code: string) => readonly [`/api/deliveries/track/${string}`];
export declare const getTrackDeliveryQueryOptions: <TData = Awaited<ReturnType<typeof trackDelivery>>, TError = ErrorType<void>>(code: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof trackDelivery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof trackDelivery>>, TError, TData> & {
    queryKey: QueryKey;
};
export type TrackDeliveryQueryResult = NonNullable<Awaited<ReturnType<typeof trackDelivery>>>;
export type TrackDeliveryQueryError = ErrorType<void>;
/**
 * @summary Public delivery tracking by tracking code
 */
export declare function useTrackDelivery<TData = Awaited<ReturnType<typeof trackDelivery>>, TError = ErrorType<void>>(code: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof trackDelivery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get delivery by order ID
 */
export declare const getGetDeliveryByOrderUrl: (orderId: number) => string;
export declare const getDeliveryByOrder: (orderId: number, options?: RequestInit) => Promise<DeliveryWithDetails>;
export declare const getGetDeliveryByOrderQueryKey: (orderId: number) => readonly [`/api/deliveries/order/${number}`];
export declare const getGetDeliveryByOrderQueryOptions: <TData = Awaited<ReturnType<typeof getDeliveryByOrder>>, TError = ErrorType<void>>(orderId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeliveryByOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDeliveryByOrder>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDeliveryByOrderQueryResult = NonNullable<Awaited<ReturnType<typeof getDeliveryByOrder>>>;
export type GetDeliveryByOrderQueryError = ErrorType<void>;
/**
 * @summary Get delivery by order ID
 */
export declare function useGetDeliveryByOrder<TData = Awaited<ReturnType<typeof getDeliveryByOrder>>, TError = ErrorType<void>>(orderId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDeliveryByOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get single delivery
 */
export declare const getGetDeliveryUrl: (id: number) => string;
export declare const getDelivery: (id: number, options?: RequestInit) => Promise<DeliveryWithDetails>;
export declare const getGetDeliveryQueryKey: (id: number) => readonly [`/api/deliveries/${number}`];
export declare const getGetDeliveryQueryOptions: <TData = Awaited<ReturnType<typeof getDelivery>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDelivery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDelivery>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDeliveryQueryResult = NonNullable<Awaited<ReturnType<typeof getDelivery>>>;
export type GetDeliveryQueryError = ErrorType<void>;
/**
 * @summary Get single delivery
 */
export declare function useGetDelivery<TData = Awaited<ReturnType<typeof getDelivery>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDelivery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update delivery status (admin)
 */
export declare const getUpdateDeliveryStatusUrl: (id: number) => string;
export declare const updateDeliveryStatus: (id: number, updateDeliveryStatusBody: UpdateDeliveryStatusBody, options?: RequestInit) => Promise<DeliveryWithDetails>;
export declare const getUpdateDeliveryStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDeliveryStatus>>, TError, {
        id: number;
        data: BodyType<UpdateDeliveryStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDeliveryStatus>>, TError, {
    id: number;
    data: BodyType<UpdateDeliveryStatusBody>;
}, TContext>;
export type UpdateDeliveryStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateDeliveryStatus>>>;
export type UpdateDeliveryStatusMutationBody = BodyType<UpdateDeliveryStatusBody>;
export type UpdateDeliveryStatusMutationError = ErrorType<unknown>;
/**
 * @summary Update delivery status (admin)
 */
export declare const useUpdateDeliveryStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDeliveryStatus>>, TError, {
        id: number;
        data: BodyType<UpdateDeliveryStatusBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDeliveryStatus>>, TError, {
    id: number;
    data: BodyType<UpdateDeliveryStatusBody>;
}, TContext>;
/**
 * @summary Assign a rider to a delivery (admin)
 */
export declare const getAssignRiderToDeliveryUrl: (id: number) => string;
export declare const assignRiderToDelivery: (id: number, assignRiderBody: AssignRiderBody, options?: RequestInit) => Promise<DeliveryWithDetails>;
export declare const getAssignRiderToDeliveryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignRiderToDelivery>>, TError, {
        id: number;
        data: BodyType<AssignRiderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof assignRiderToDelivery>>, TError, {
    id: number;
    data: BodyType<AssignRiderBody>;
}, TContext>;
export type AssignRiderToDeliveryMutationResult = NonNullable<Awaited<ReturnType<typeof assignRiderToDelivery>>>;
export type AssignRiderToDeliveryMutationBody = BodyType<AssignRiderBody>;
export type AssignRiderToDeliveryMutationError = ErrorType<unknown>;
/**
 * @summary Assign a rider to a delivery (admin)
 */
export declare const useAssignRiderToDelivery: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignRiderToDelivery>>, TError, {
        id: number;
        data: BodyType<AssignRiderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof assignRiderToDelivery>>, TError, {
    id: number;
    data: BodyType<AssignRiderBody>;
}, TContext>;
/**
 * @summary List all deliveries (admin)
 */
export declare const getGetAdminDeliveriesUrl: () => string;
export declare const getAdminDeliveries: (options?: RequestInit) => Promise<DeliveryWithDetails[]>;
export declare const getGetAdminDeliveriesQueryKey: () => readonly ["/api/admin/deliveries"];
export declare const getGetAdminDeliveriesQueryOptions: <TData = Awaited<ReturnType<typeof getAdminDeliveries>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminDeliveries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminDeliveries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminDeliveriesQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminDeliveries>>>;
export type GetAdminDeliveriesQueryError = ErrorType<unknown>;
/**
 * @summary List all deliveries (admin)
 */
export declare function useGetAdminDeliveries<TData = Awaited<ReturnType<typeof getAdminDeliveries>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminDeliveries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all riders (admin)
 */
export declare const getGetRidersUrl: () => string;
export declare const getRiders: (options?: RequestInit) => Promise<Rider[]>;
export declare const getGetRidersQueryKey: () => readonly ["/api/riders"];
export declare const getGetRidersQueryOptions: <TData = Awaited<ReturnType<typeof getRiders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRiders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRiders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRidersQueryResult = NonNullable<Awaited<ReturnType<typeof getRiders>>>;
export type GetRidersQueryError = ErrorType<unknown>;
/**
 * @summary List all riders (admin)
 */
export declare function useGetRiders<TData = Awaited<ReturnType<typeof getRiders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRiders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new rider (admin)
 */
export declare const getCreateRiderUrl: () => string;
export declare const createRider: (createRiderBody: CreateRiderBody, options?: RequestInit) => Promise<Rider>;
export declare const getCreateRiderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRider>>, TError, {
        data: BodyType<CreateRiderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRider>>, TError, {
    data: BodyType<CreateRiderBody>;
}, TContext>;
export type CreateRiderMutationResult = NonNullable<Awaited<ReturnType<typeof createRider>>>;
export type CreateRiderMutationBody = BodyType<CreateRiderBody>;
export type CreateRiderMutationError = ErrorType<unknown>;
/**
 * @summary Create a new rider (admin)
 */
export declare const useCreateRider: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRider>>, TError, {
        data: BodyType<CreateRiderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRider>>, TError, {
    data: BodyType<CreateRiderBody>;
}, TContext>;
/**
 * @summary List available riders (admin)
 */
export declare const getGetAvailableRidersUrl: () => string;
export declare const getAvailableRiders: (options?: RequestInit) => Promise<Rider[]>;
export declare const getGetAvailableRidersQueryKey: () => readonly ["/api/riders/available"];
export declare const getGetAvailableRidersQueryOptions: <TData = Awaited<ReturnType<typeof getAvailableRiders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAvailableRiders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAvailableRiders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAvailableRidersQueryResult = NonNullable<Awaited<ReturnType<typeof getAvailableRiders>>>;
export type GetAvailableRidersQueryError = ErrorType<unknown>;
/**
 * @summary List available riders (admin)
 */
export declare function useGetAvailableRiders<TData = Awaited<ReturnType<typeof getAvailableRiders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAvailableRiders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update rider (admin)
 */
export declare const getUpdateRiderUrl: (id: number) => string;
export declare const updateRider: (id: number, updateRiderBody: UpdateRiderBody, options?: RequestInit) => Promise<Rider>;
export declare const getUpdateRiderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRider>>, TError, {
        id: number;
        data: BodyType<UpdateRiderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateRider>>, TError, {
    id: number;
    data: BodyType<UpdateRiderBody>;
}, TContext>;
export type UpdateRiderMutationResult = NonNullable<Awaited<ReturnType<typeof updateRider>>>;
export type UpdateRiderMutationBody = BodyType<UpdateRiderBody>;
export type UpdateRiderMutationError = ErrorType<unknown>;
/**
 * @summary Update rider (admin)
 */
export declare const useUpdateRider: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRider>>, TError, {
        id: number;
        data: BodyType<UpdateRiderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateRider>>, TError, {
    id: number;
    data: BodyType<UpdateRiderBody>;
}, TContext>;
/**
 * @summary Toggle rider availability (admin)
 */
export declare const getToggleRiderAvailabilityUrl: (id: number) => string;
export declare const toggleRiderAvailability: (id: number, options?: RequestInit) => Promise<Rider>;
export declare const getToggleRiderAvailabilityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleRiderAvailability>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof toggleRiderAvailability>>, TError, {
    id: number;
}, TContext>;
export type ToggleRiderAvailabilityMutationResult = NonNullable<Awaited<ReturnType<typeof toggleRiderAvailability>>>;
export type ToggleRiderAvailabilityMutationError = ErrorType<unknown>;
/**
 * @summary Toggle rider availability (admin)
 */
export declare const useToggleRiderAvailability: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleRiderAvailability>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof toggleRiderAvailability>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Initialize Paystack payment for an order
 */
export declare const getInitializePaystackPaymentUrl: () => string;
export declare const initializePaystackPayment: (initiatePaymentBody: InitiatePaymentBody, options?: RequestInit) => Promise<PaystackInitResponse>;
export declare const getInitializePaystackPaymentMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initializePaystackPayment>>, TError, {
        data: BodyType<InitiatePaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof initializePaystackPayment>>, TError, {
    data: BodyType<InitiatePaymentBody>;
}, TContext>;
export type InitializePaystackPaymentMutationResult = NonNullable<Awaited<ReturnType<typeof initializePaystackPayment>>>;
export type InitializePaystackPaymentMutationBody = BodyType<InitiatePaymentBody>;
export type InitializePaystackPaymentMutationError = ErrorType<void>;
/**
 * @summary Initialize Paystack payment for an order
 */
export declare const useInitializePaystackPayment: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof initializePaystackPayment>>, TError, {
        data: BodyType<InitiatePaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof initializePaystackPayment>>, TError, {
    data: BodyType<InitiatePaymentBody>;
}, TContext>;
/**
 * @summary Verify Paystack payment and lock escrow
 */
export declare const getVerifyPaystackPaymentUrl: () => string;
export declare const verifyPaystackPayment: (verifyPaymentBody: VerifyPaymentBody, options?: RequestInit) => Promise<PaystackVerifyResponse>;
export declare const getVerifyPaystackPaymentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyPaystackPayment>>, TError, {
        data: BodyType<VerifyPaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyPaystackPayment>>, TError, {
    data: BodyType<VerifyPaymentBody>;
}, TContext>;
export type VerifyPaystackPaymentMutationResult = NonNullable<Awaited<ReturnType<typeof verifyPaystackPayment>>>;
export type VerifyPaystackPaymentMutationBody = BodyType<VerifyPaymentBody>;
export type VerifyPaystackPaymentMutationError = ErrorType<unknown>;
/**
 * @summary Verify Paystack payment and lock escrow
 */
export declare const useVerifyPaystackPayment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyPaystackPayment>>, TError, {
        data: BodyType<VerifyPaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyPaystackPayment>>, TError, {
    data: BodyType<VerifyPaymentBody>;
}, TContext>;
/**
 * @summary Paystack webhook endpoint
 */
export declare const getPaystackWebhookUrl: () => string;
export declare const paystackWebhook: (options?: RequestInit) => Promise<void>;
export declare const getPaystackWebhookMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof paystackWebhook>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof paystackWebhook>>, TError, void, TContext>;
export type PaystackWebhookMutationResult = NonNullable<Awaited<ReturnType<typeof paystackWebhook>>>;
export type PaystackWebhookMutationError = ErrorType<unknown>;
/**
 * @summary Paystack webhook endpoint
 */
export declare const usePaystackWebhook: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof paystackWebhook>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof paystackWebhook>>, TError, void, TContext>;
/**
 * @summary Get user transaction history
 */
export declare const getGetTransactionsUrl: () => string;
export declare const getTransactions: (options?: RequestInit) => Promise<Transaction[]>;
export declare const getGetTransactionsQueryKey: () => readonly ["/api/transactions"];
export declare const getGetTransactionsQueryOptions: <TData = Awaited<ReturnType<typeof getTransactions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTransactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTransactions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTransactionsQueryResult = NonNullable<Awaited<ReturnType<typeof getTransactions>>>;
export type GetTransactionsQueryError = ErrorType<unknown>;
/**
 * @summary Get user transaction history
 */
export declare function useGetTransactions<TData = Awaited<ReturnType<typeof getTransactions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTransactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary All transactions (admin)
 */
export declare const getGetAdminTransactionsUrl: () => string;
export declare const getAdminTransactions: (options?: RequestInit) => Promise<Transaction[]>;
export declare const getGetAdminTransactionsQueryKey: () => readonly ["/api/admin/transactions"];
export declare const getGetAdminTransactionsQueryOptions: <TData = Awaited<ReturnType<typeof getAdminTransactions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminTransactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminTransactions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminTransactionsQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminTransactions>>>;
export type GetAdminTransactionsQueryError = ErrorType<unknown>;
/**
 * @summary All transactions (admin)
 */
export declare function useGetAdminTransactions<TData = Awaited<ReturnType<typeof getAdminTransactions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminTransactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Release escrow payout to seller (admin)
 */
export declare const getReleasePayoutUrl: (orderId: number) => string;
export declare const releasePayout: (orderId: number, options?: RequestInit) => Promise<void>;
export declare const getReleasePayoutMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof releasePayout>>, TError, {
        orderId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof releasePayout>>, TError, {
    orderId: number;
}, TContext>;
export type ReleasePayoutMutationResult = NonNullable<Awaited<ReturnType<typeof releasePayout>>>;
export type ReleasePayoutMutationError = ErrorType<void>;
/**
 * @summary Release escrow payout to seller (admin)
 */
export declare const useReleasePayout: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof releasePayout>>, TError, {
        orderId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof releasePayout>>, TError, {
    orderId: number;
}, TContext>;
/**
 * @summary Process refund for an order (admin)
 */
export declare const getProcessRefundUrl: (orderId: number) => string;
export declare const processRefund: (orderId: number, processRefundBody?: ProcessRefundBody, options?: RequestInit) => Promise<void>;
export declare const getProcessRefundMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof processRefund>>, TError, {
        orderId: number;
        data: BodyType<ProcessRefundBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof processRefund>>, TError, {
    orderId: number;
    data: BodyType<ProcessRefundBody>;
}, TContext>;
export type ProcessRefundMutationResult = NonNullable<Awaited<ReturnType<typeof processRefund>>>;
export type ProcessRefundMutationBody = BodyType<ProcessRefundBody>;
export type ProcessRefundMutationError = ErrorType<unknown>;
/**
 * @summary Process refund for an order (admin)
 */
export declare const useProcessRefund: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof processRefund>>, TError, {
        orderId: number;
        data: BodyType<ProcessRefundBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof processRefund>>, TError, {
    orderId: number;
    data: BodyType<ProcessRefundBody>;
}, TContext>;
/**
 * @summary Get user's disputes
 */
export declare const getGetDisputesUrl: () => string;
export declare const getDisputes: (options?: RequestInit) => Promise<Dispute[]>;
export declare const getGetDisputesQueryKey: () => readonly ["/api/disputes"];
export declare const getGetDisputesQueryOptions: <TData = Awaited<ReturnType<typeof getDisputes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDisputes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDisputes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDisputesQueryResult = NonNullable<Awaited<ReturnType<typeof getDisputes>>>;
export type GetDisputesQueryError = ErrorType<unknown>;
/**
 * @summary Get user's disputes
 */
export declare function useGetDisputes<TData = Awaited<ReturnType<typeof getDisputes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDisputes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Raise a dispute for an order
 */
export declare const getCreateDisputeUrl: () => string;
export declare const createDispute: (createDisputeBody: CreateDisputeBody, options?: RequestInit) => Promise<Dispute>;
export declare const getCreateDisputeMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDispute>>, TError, {
        data: BodyType<CreateDisputeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createDispute>>, TError, {
    data: BodyType<CreateDisputeBody>;
}, TContext>;
export type CreateDisputeMutationResult = NonNullable<Awaited<ReturnType<typeof createDispute>>>;
export type CreateDisputeMutationBody = BodyType<CreateDisputeBody>;
export type CreateDisputeMutationError = ErrorType<void>;
/**
 * @summary Raise a dispute for an order
 */
export declare const useCreateDispute: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDispute>>, TError, {
        data: BodyType<CreateDisputeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createDispute>>, TError, {
    data: BodyType<CreateDisputeBody>;
}, TContext>;
/**
 * @summary Get single dispute
 */
export declare const getGetDisputeUrl: (id: number) => string;
export declare const getDispute: (id: number, options?: RequestInit) => Promise<Dispute>;
export declare const getGetDisputeQueryKey: (id: number) => readonly [`/api/disputes/${number}`];
export declare const getGetDisputeQueryOptions: <TData = Awaited<ReturnType<typeof getDispute>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDispute>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDispute>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDisputeQueryResult = NonNullable<Awaited<ReturnType<typeof getDispute>>>;
export type GetDisputeQueryError = ErrorType<void>;
/**
 * @summary Get single dispute
 */
export declare function useGetDispute<TData = Awaited<ReturnType<typeof getDispute>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDispute>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all disputes (admin)
 */
export declare const getGetAdminDisputesUrl: () => string;
export declare const getAdminDisputes: (options?: RequestInit) => Promise<Dispute[]>;
export declare const getGetAdminDisputesQueryKey: () => readonly ["/api/admin/disputes"];
export declare const getGetAdminDisputesQueryOptions: <TData = Awaited<ReturnType<typeof getAdminDisputes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminDisputes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminDisputes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminDisputesQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminDisputes>>>;
export type GetAdminDisputesQueryError = ErrorType<unknown>;
/**
 * @summary List all disputes (admin)
 */
export declare function useGetAdminDisputes<TData = Awaited<ReturnType<typeof getAdminDisputes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminDisputes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Mark dispute as under review (admin)
 */
export declare const getMarkDisputeUnderReviewUrl: (id: number) => string;
export declare const markDisputeUnderReview: (id: number, options?: RequestInit) => Promise<Dispute>;
export declare const getMarkDisputeUnderReviewMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markDisputeUnderReview>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markDisputeUnderReview>>, TError, {
    id: number;
}, TContext>;
export type MarkDisputeUnderReviewMutationResult = NonNullable<Awaited<ReturnType<typeof markDisputeUnderReview>>>;
export type MarkDisputeUnderReviewMutationError = ErrorType<unknown>;
/**
 * @summary Mark dispute as under review (admin)
 */
export declare const useMarkDisputeUnderReview: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markDisputeUnderReview>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markDisputeUnderReview>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Resolve a dispute (admin)
 */
export declare const getResolveDisputeUrl: (id: number) => string;
export declare const resolveDispute: (id: number, resolveDisputeBody: ResolveDisputeBody, options?: RequestInit) => Promise<Dispute>;
export declare const getResolveDisputeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resolveDispute>>, TError, {
        id: number;
        data: BodyType<ResolveDisputeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resolveDispute>>, TError, {
    id: number;
    data: BodyType<ResolveDisputeBody>;
}, TContext>;
export type ResolveDisputeMutationResult = NonNullable<Awaited<ReturnType<typeof resolveDispute>>>;
export type ResolveDisputeMutationBody = BodyType<ResolveDisputeBody>;
export type ResolveDisputeMutationError = ErrorType<unknown>;
/**
 * @summary Resolve a dispute (admin)
 */
export declare const useResolveDispute: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resolveDispute>>, TError, {
        id: number;
        data: BodyType<ResolveDisputeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resolveDispute>>, TError, {
    id: number;
    data: BodyType<ResolveDisputeBody>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map