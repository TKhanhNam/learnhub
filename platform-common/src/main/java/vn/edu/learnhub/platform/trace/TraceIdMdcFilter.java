// path: platform-common/src/main/java/vn/edu/learnhub/platform/trace/TraceIdMdcFilter.java
// purpose: doc X-Trace-Id do Gateway gan vao, day vao MDC de MOI dong log cua service nay
// deu mang cung 1 traceId => truy vet 1 request di qua nhieu service (Distributed Tracing).

package vn.edu.learnhub.platform.trace;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(1)
public class TraceIdMdcFilter extends OncePerRequestFilter {

    public static final String TRACE_HEADER = "X-Trace-Id";
    public static final String MDC_KEY = "traceId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String traceId = request.getHeader(TRACE_HEADER);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }

        MDC.put(MDC_KEY, traceId);
        response.setHeader(TRACE_HEADER, traceId);
        TraceContext.set(traceId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
            TraceContext.clear();
        }
    }
}
