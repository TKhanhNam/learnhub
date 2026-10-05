package vn.edu.learnhub.payment.service;

import org.springframework.stereotype.Service;
import vn.edu.learnhub.payment.entity.PaymentTransaction;

import java.util.Map;

@Service
public class PaymentFlow {
    private final MomoGateway momo;
    private final CommerceNotifier commerce;

    public PaymentFlow(MomoGateway momo, CommerceNotifier commerce) {
        this.momo = momo;
        this.commerce = commerce;
    }

    public String finish(Map<String, String> payload) {
        if (!momo.valid(payload)) {
            return "invalid";
        }
        PaymentTransaction tx = momo.apply(payload);
        if ("paid".equals(tx.getStatus())) {
            commerce.confirm(tx);
            return "success";
        }
        commerce.fail(tx);
        return "failed";
    }
}
