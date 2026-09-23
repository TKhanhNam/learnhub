package vn.edu.learnhub.commerce.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.commerce.client.CatalogClient;
import vn.edu.learnhub.commerce.client.IdentityClient;
import vn.edu.learnhub.commerce.client.LearningClient;
import vn.edu.learnhub.commerce.dto.CommerceDtos;
import vn.edu.learnhub.commerce.entity.CartItem;
import vn.edu.learnhub.commerce.entity.Order;
import vn.edu.learnhub.commerce.entity.OrderItem;
import vn.edu.learnhub.commerce.entity.OutboxEvent;
import vn.edu.learnhub.commerce.repository.CartItemRepository;
import vn.edu.learnhub.commerce.repository.OrderItemRepository;
import vn.edu.learnhub.commerce.repository.OrderRepository;
import vn.edu.learnhub.commerce.repository.OutboxEventRepository;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class CommerceService {

    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final CatalogClient catalogClient;
    private final LearningClient learningClient;
    private final IdentityClient identityClient;
    private final BigDecimal platformFeePercent;
    private final BigDecimal aiExtraPercent;

    public CommerceService(CartItemRepository cartItemRepository,
                           OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository,
                           OutboxEventRepository outboxEventRepository,
                           CatalogClient catalogClient,
                           LearningClient learningClient,
                           IdentityClient identityClient,
                           @Value("${commerce.platform-fee-percent:30}") int platformFeePercent,
                           @Value("${commerce.ai-extra-percent:5}") int aiExtraPercent) {
        this.cartItemRepository = cartItemRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.catalogClient = catalogClient;
        this.learningClient = learningClient;
        this.identityClient = identityClient;
        this.platformFeePercent = BigDecimal.valueOf(platformFeePercent);
        this.aiExtraPercent = BigDecimal.valueOf(aiExtraPercent);
    }

    public CommerceDtos.CartDTO getCart(Long userId) {
        List<CommerceDtos.CartItemDTO> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem cartItem : cartItemRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            CommerceDtos.CourseSnapshot snap = catalogClient.snapshot(cartItem.getCourseId());
            items.add(new CommerceDtos.CartItemDTO(cartItem.getId(), snap.id(), snap.title(),
                    snap.thumbnailUrl(), snap.price(), snap.instructorId(), snap.aiAssistEnabled()));
            subtotal = subtotal.add(snap.price() == null ? BigDecimal.ZERO : snap.price());
        }
        return new CommerceDtos.CartDTO(items, subtotal);
    }

    @Transactional
    public CommerceDtos.CartDTO addToCart(Long userId, Long courseId) {
        CommerceDtos.CourseSnapshot snap = catalogClient.snapshot(courseId);
        if (!"PUBLISHED".equalsIgnoreCase(snap.status())) {
            throw BusinessException.badRequest("Khoa hoc chua duoc phat hanh");
        }
        if (!cartItemRepository.existsByUserIdAndCourseId(userId, courseId)) {
            CartItem item = new CartItem();
            item.setUserId(userId);
            item.setCourseId(courseId);
            item.setCreatedAt(Instant.now());
            cartItemRepository.save(item);
        }
        return getCart(userId);
    }

    @Transactional
    public CommerceDtos.CartDTO removeFromCart(Long userId, Long courseId) {
        cartItemRepository.findByUserIdAndCourseId(userId, courseId)
                .ifPresent(cartItemRepository::delete);
        return getCart(userId);
    }

    @Transactional
    public CommerceDtos.OrderDTO checkout(Long buyerId, CommerceDtos.CheckoutRequest request) {
        List<CartItem> cart = cartItemRepository.findByUserIdOrderByCreatedAtDesc(buyerId);
        if (cart.isEmpty()) {
            throw BusinessException.badRequest("Gio hang trong");
        }

        Long recipientId = buyerId;
        String recipientEmail = null;
        String source = "PURCHASE";
        if (request != null && request.gift()) {
            source = "GIFT";
            if (request.recipientUserId() != null) {
                recipientId = request.recipientUserId();
            } else if (request.recipientEmail() != null && !request.recipientEmail().isBlank()) {
                recipientEmail = request.recipientEmail().trim();
                recipientId = identityClient.byEmail(recipientEmail).id();
            } else {
                throw BusinessException.badRequest("Mua tang can email hoac ma nguoi nhan");
            }
            if (recipientId.equals(buyerId)) {
                throw BusinessException.badRequest("Khong the tu tang cho chinh minh");
            }
        }

        List<CommerceDtos.CourseSnapshot> snapshots = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        boolean anyAi = false;
        for (CartItem cartItem : cart) {
            CommerceDtos.CourseSnapshot snap = catalogClient.snapshot(cartItem.getCourseId());
            snapshots.add(snap);
            subtotal = subtotal.add(nvl(snap.price()));
            anyAi = anyAi || snap.aiAssistEnabled();
        }

        BigDecimal discount = BigDecimal.ZERO;
        Long couponId = null;
        String couponCode = request == null ? null : request.couponCode();
        if (couponCode != null && !couponCode.isBlank()) {
            CommerceDtos.CouponCheck check = catalogClient.checkCoupon(couponCode, snapshots.getFirst().id());
            if (!check.valid()) {
                throw BusinessException.badRequest(check.message());
            }
            couponId = check.couponId();
            discount = subtotal.multiply(BigDecimal.valueOf(check.discountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        BigDecimal total = subtotal.subtract(discount);
        BigDecimal feeRate = platformFeePercent.add(anyAi ? aiExtraPercent : BigDecimal.ZERO);
        BigDecimal platformFee = total.multiply(feeRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal instructorEarn = total.subtract(platformFee);

        Order order = new Order();
        order.setBuyerId(buyerId);
        order.setRecipientId(recipientId);
        order.setRecipientEmail(recipientEmail);
        order.setStatus(Order.PAID);
        order.setCouponCode(couponCode);
        order.setCouponId(couponId);
        order.setSubtotal(subtotal);
        order.setDiscount(discount);
        order.setTotal(total);
        order.setPlatformFee(platformFee);
        order.setInstructorEarn(instructorEarn);
        order.setCreatedAt(Instant.now());
        order = orderRepository.save(order);

        List<OrderItem> savedItems = new ArrayList<>();
        List<Long> grantedCourseIds = new ArrayList<>();
        try {
            for (CommerceDtos.CourseSnapshot snap : snapshots) {
                OrderItem item = new OrderItem();
                item.setOrderId(order.getId());
                item.setCourseId(snap.id());
                item.setInstructorId(snap.instructorId());
                item.setTitle(snap.title());
                item.setPrice(nvl(snap.price()));
                item.setAiAssist(snap.aiAssistEnabled());
                savedItems.add(orderItemRepository.save(item));

                learningClient.grant(recipientId, snap.id(), source, order.getId());
                grantedCourseIds.add(snap.id());
                catalogClient.increaseEnrollment(snap.id());
            }
            if (couponId != null) {
                catalogClient.redeem(couponId);
            }
        } catch (RuntimeException ex) {
            for (Long courseId : grantedCourseIds) {
                try {
                    learningClient.revoke(recipientId, courseId);
                } catch (Exception ignored) {
                    // compensate tot nhat co the
                }
            }
            if (couponId != null) {
                try {
                    catalogClient.release(couponId);
                } catch (Exception ignored) {
                    // ignore
                }
            }
            order.setStatus(Order.FAILED);
            orderRepository.save(order);
            throw ex;
        }

        cartItemRepository.deleteByUserId(buyerId);

        OutboxEvent event = new OutboxEvent();
        event.setEventType("ORDER_PAID");
        event.setPayload("{\"orderId\":" + order.getId() + ",\"recipientId\":" + recipientId + "}");
        event.setPublished(true);
        outboxEventRepository.save(event);

        return toDto(order, savedItems);
    }

    public Page<CommerceDtos.OrderDTO> myOrders(Long buyerId, Pageable pageable) {
        return orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId, pageable).map(this::toDto);
    }

    public Page<CommerceDtos.OrderDTO> adminOrders(Pageable pageable) {
        return orderRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    public CommerceDtos.AnalyticsDTO adminAnalytics() {
        List<Order> orders = orderRepository.findAll();
        List<Order> paid = orders.stream().filter(o -> Order.PAID.equals(o.getStatus())).toList();
        List<Order> failed = orders.stream().filter(o -> Order.FAILED.equals(o.getStatus())).toList();
        BigDecimal revenue = paid.stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fee = paid.stream().map(Order::getPlatformFee).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal instructor = paid.stream().map(Order::getInstructorEarn).reduce(BigDecimal.ZERO, BigDecimal::add);
        long itemsSold = paid.stream().mapToLong(o -> orderItemRepository.findByOrderId(o.getId()).size()).sum();
        BigDecimal avg = paid.isEmpty()
                ? BigDecimal.ZERO
                : revenue.divide(BigDecimal.valueOf(paid.size()), 2, RoundingMode.HALF_UP);
        CommerceDtos.AdminStatsDTO summary = new CommerceDtos.AdminStatsDTO(
                paid.size(), failed.size(), revenue, fee, instructor, avg, itemsSold);

        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.LocalDate today = java.time.LocalDate.now(zone);
        java.util.Map<java.time.LocalDate, List<Order>> byDay = paid.stream()
                .collect(java.util.stream.Collectors.groupingBy(o ->
                        java.time.LocalDate.ofInstant(o.getCreatedAt(), zone)));
        List<CommerceDtos.DailyPoint> last14 = new ArrayList<>();
        for (int i = 13; i >= 0; i--) {
            java.time.LocalDate day = today.minusDays(i);
            List<Order> dayOrders = byDay.getOrDefault(day, List.of());
            BigDecimal dayRev = dayOrders.stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            last14.add(new CommerceDtos.DailyPoint(day.toString(), dayRev, dayOrders.size()));
        }

        java.util.Map<Long, CommerceDtos.CourseRevenue> top = new java.util.LinkedHashMap<>();
        for (Order order : paid) {
            for (OrderItem item : orderItemRepository.findByOrderId(order.getId())) {
                CommerceDtos.CourseRevenue current = top.getOrDefault(item.getCourseId(),
                        new CommerceDtos.CourseRevenue(item.getCourseId(), item.getTitle(), 0, BigDecimal.ZERO));
                top.put(item.getCourseId(), new CommerceDtos.CourseRevenue(
                        item.getCourseId(), item.getTitle(), current.sold() + 1,
                        current.revenue().add(nvl(item.getPrice()))));
            }
        }
        List<CommerceDtos.CourseRevenue> topCourses = top.values().stream()
                .sorted((a, b) -> b.revenue().compareTo(a.revenue()))
                .limit(8)
                .toList();
        return new CommerceDtos.AnalyticsDTO(summary, last14, topCourses);
    }

    public byte[] exportExcel() {
        List<Order> orders = orderRepository.findAll();
        CommerceDtos.AnalyticsDTO analytics = adminAnalytics();
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Sheet overview = workbook.createSheet("Tong quan");
            String[] ovHeaders = {"Chi so", "Gia tri"};
            org.apache.poi.ss.usermodel.Row ovHead = overview.createRow(0);
            ovHead.createCell(0).setCellValue(ovHeaders[0]);
            ovHead.createCell(1).setCellValue(ovHeaders[1]);
            CommerceDtos.AdminStatsDTO s = analytics.summary();
            Object[][] ovRows = {
                    {"Don da thanh toan", s.paidOrders()},
                    {"Don that bai", s.failedOrders()},
                    {"Doanh thu", s.revenue()},
                    {"Phi san", s.platformFee()},
                    {"Giang vien nhan", s.instructorEarn()},
                    {"Don trung binh", s.avgOrder()},
                    {"Khoa da ban", s.itemsSold()}
            };
            for (int i = 0; i < ovRows.length; i++) {
                org.apache.poi.ss.usermodel.Row row = overview.createRow(i + 1);
                row.createCell(0).setCellValue(String.valueOf(ovRows[i][0]));
                row.createCell(1).setCellValue(String.valueOf(ovRows[i][1]));
            }

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Don hang");
            String[] headers = {"ID", "Nguoi mua", "Trang thai", "Tong", "Phi san", "Giang vien", "Ma giam", "Thoi gian"};
            org.apache.poi.ss.usermodel.Row head = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                head.createCell(i).setCellValue(headers[i]);
            }
            int rowIdx = 1;
            for (Order order : orders) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(order.getId());
                row.createCell(1).setCellValue(order.getBuyerId());
                row.createCell(2).setCellValue(order.getStatus());
                row.createCell(3).setCellValue(nvl(order.getTotal()).doubleValue());
                row.createCell(4).setCellValue(nvl(order.getPlatformFee()).doubleValue());
                row.createCell(5).setCellValue(nvl(order.getInstructorEarn()).doubleValue());
                row.createCell(6).setCellValue(order.getCouponCode() == null ? "" : order.getCouponCode());
                row.createCell(7).setCellValue(order.getCreatedAt() == null ? "" : order.getCreatedAt().toString());
            }

            org.apache.poi.ss.usermodel.Sheet courses = workbook.createSheet("Khoa ban chay");
            org.apache.poi.ss.usermodel.Row cHead = courses.createRow(0);
            cHead.createCell(0).setCellValue("Khoa hoc");
            cHead.createCell(1).setCellValue("So luong");
            cHead.createCell(2).setCellValue("Doanh thu");
            int cIdx = 1;
            for (CommerceDtos.CourseRevenue item : analytics.topCourses()) {
                org.apache.poi.ss.usermodel.Row row = courses.createRow(cIdx++);
                row.createCell(0).setCellValue(item.title());
                row.createCell(1).setCellValue(item.sold());
                row.createCell(2).setCellValue(item.revenue().doubleValue());
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw BusinessException.badRequest("Khong xuat duoc Excel doanh thu");
        }
    }

    public CommerceDtos.InstructorPayoutDTO instructorPayout(Long instructorId) {
        List<OrderItem> items = orderItemRepository.findByInstructorId(instructorId);
        BigDecimal gross = items.stream().map(OrderItem::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fee = gross.multiply(platformFeePercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return new CommerceDtos.InstructorPayoutDTO(instructorId, gross, fee, gross.subtract(fee), items.size());
    }

    private CommerceDtos.OrderDTO toDto(Order order) {
        return toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    private CommerceDtos.OrderDTO toDto(Order order, List<OrderItem> items) {
        List<CommerceDtos.OrderItemDTO> itemDtos = items.stream()
                .map(item -> new CommerceDtos.OrderItemDTO(item.getCourseId(), item.getTitle(),
                        item.getPrice(), item.getInstructorId(), item.isAiAssist()))
                .toList();
        return new CommerceDtos.OrderDTO(order.getId(), order.getBuyerId(), order.getRecipientId(),
                order.getRecipientEmail(), order.getStatus(), order.getCouponCode(), order.getSubtotal(),
                order.getDiscount(), order.getTotal(), order.getPlatformFee(), order.getInstructorEarn(),
                order.getCreatedAt(), itemDtos);
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
