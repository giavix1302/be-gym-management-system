import express from 'express'
import { upload } from '~/config/cloudinary.config'
import { paymentController } from '../controller/payment.controller'

const Router = express.Router()

// ============================================
// ROUTES THANH TOÁN VNPAY (GỐC)
// ============================================
Router.route('/vnpay/subscription').post(paymentController.createPaymentVnpay)
Router.route('/vnpay-return').get(paymentController.vnpReturn)
Router.route('/vnpay/booking').post(paymentController.createPaymentBookingPtVnpay)
Router.route('/vnpay/class').post(paymentController.createPaymentClassVnpay)

// ============================================
// ROUTES QUẢN LÝ PAYMENTS (GỐC)
// ============================================
Router.route('/user/:userId').get(paymentController.getPaymentsByUserId) // Lấy payments theo userId
Router.route('/admin/all').get(paymentController.getAllPaymentsForAdmin) // Lấy tất cả payments cho admin
Router.route('/admin/:id/refund').put(paymentController.updateRefundPayment)

// ============================================
// ROUTES THỐNG KÊ MỚI
// ============================================

/**
 * GET /api/v1/payments/statistics/all
 * Lấy TẤT CẢ thống kê cùng lúc (4 cards + 4 charts)
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31&groupBy=month
 *
 * Response: {
 *   success: true,
 *   data: {
 *     overview: { totalRevenue, successfulTransactions, averageTransactionAmount, totalRefunded },
 *     charts: {
 *       revenueByType: [...],
 *       revenueTrend: [...],
 *       methodDistribution: [...],
 *       statusOverTime: [...]
 *     }
 *   }
 * }
 */
Router.route('/statistics/all').get(paymentController.getAllPaymentStatistics)

/**
 * GET /api/v1/payments/statistics/overview
 * Lấy 4 cards tổng quan
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31
 */
Router.route('/statistics/overview').get(paymentController.getPaymentOverviewStats)

/**
 * GET /api/v1/payments/statistics/revenue-by-type
 * Chart 1: Doanh thu theo loại thanh toán (membership/booking/class)
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31
 */
Router.route('/statistics/revenue-by-type').get(paymentController.getPaymentRevenueByType)

/**
 * GET /api/v1/payments/statistics/revenue-trend
 * Chart 2: Xu hướng doanh thu theo thời gian
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31&groupBy=day
 * groupBy options: day, week, month
 */
Router.route('/statistics/revenue-trend').get(paymentController.getPaymentRevenueTrend)

/**
 * GET /api/v1/payments/statistics/payment-methods
 * Chart 3: Phân bố phương thức thanh toán (cash/bank/momo/vnpay)
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31
 */
Router.route('/statistics/payment-methods').get(paymentController.getPaymentMethodDistribution)

/**
 * GET /api/v1/payments/statistics/status-over-time
 * Chart 4: Trạng thái thanh toán theo thời gian (paid/unpaid/refunded)
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31&groupBy=day
 * groupBy options: day, week, month
 */
Router.route('/statistics/status-over-time').get(paymentController.getPaymentStatusOverTime)

/**
 * GET /api/v1/payments/statistics/top-customers
 * Bonus: Top khách hàng chi tiêu nhiều nhất
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31&limit=10
 */
Router.route('/statistics/top-customers').get(paymentController.getTopSpendingCustomers)

export const paymentRoute = Router
