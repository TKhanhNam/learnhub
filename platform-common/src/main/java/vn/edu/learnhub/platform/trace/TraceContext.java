// path: platform-common/src/main/java/vn/edu/learnhub/platform/trace/TraceContext.java
// purpose: giu traceId cua request hien tai de khi service nay goi sang service khac
// thi gui kem dung traceId do (khong tao moi), nho vay ca chuoi goi van cung 1 dau vet.

package vn.edu.learnhub.platform.trace;

public final class TraceContext {

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private TraceContext() {
    }

    public static void set(String traceId) {
        CURRENT.set(traceId);
    }

    public static String get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
