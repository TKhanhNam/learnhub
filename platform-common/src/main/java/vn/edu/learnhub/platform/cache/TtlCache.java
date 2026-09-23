// path: platform-common/src/main/java/vn/edu/learnhub/platform/cache/TtlCache.java
// purpose: Cache-Aside Pattern (file cong nghe loi muc 4): doc cache truoc, miss thi query DB roi ghi cache.
// TTL co cong them jitter ngau nhien de tranh Cache Avalanche (tat ca key het han cung luc).
// Ban nay luu trong RAM de chay duoc ngay; production doi sang Redis (xem README).

package vn.edu.learnhub.platform.cache;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

@Component
public class TtlCache {

    private static final int MAX_ENTRIES = 500;

    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    @SuppressWarnings("unchecked")
    public <T> T get(String key, long ttlMs, Supplier<T> loader) {
        Entry entry = store.get(key);
        long now = System.currentTimeMillis();

        if (entry != null && entry.expiresAtMs() > now) {
            return (T) entry.value();
        }

        T value = loader.get();

        if (store.size() >= MAX_ENTRIES) {
            store.clear(); // don gian hoa viec thu hoi bo nho cho do an hoc tap
        }
        // jitter +-20% de chong Cache Avalanche
        long jitter = (long) (ttlMs * (ThreadLocalRandom.current().nextDouble() * 0.4 - 0.2));
        store.put(key, new Entry(value, now + ttlMs + jitter));
        return value;
    }

    /** Goi sau khi ghi/sua/xoa du lieu de cache khong tra ve ban cu. */
    public void evictPrefix(String prefix) {
        store.keySet().removeIf(key -> key.startsWith(prefix));
    }

    private record Entry(Object value, long expiresAtMs) {
    }
}
