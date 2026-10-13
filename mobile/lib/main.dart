import 'package:flutter/material.dart';

void main() {
  runApp(const LearnHubApp());
}

class Course {
  const Course({required this.slug, required this.title, required this.shop, required this.city, required this.price, required this.level});
  final String slug;
  final String title;
  final String shop;
  final String city;
  final int price;
  final String level;
}

const courses = [
  Course(slug: 'java-co-ban', title: 'Java cơ bản cho người mới', shop: 'Shop Mai Lan', city: 'Hà Nội', price: 499000, level: 'Cơ bản'),
  Course(slug: 'ielts-writing', title: 'IELTS Writing 6.5', shop: 'Shop Trần Khoa', city: 'TP. Hồ Chí Minh', price: 790000, level: 'Trung cấp'),
  Course(slug: 'ui-can-ban', title: 'Thiết kế giao diện căn bản', shop: 'Shop Lê Hà', city: 'Đà Nẵng', price: 650000, level: 'Cơ bản'),
];

class LearnHubApp extends StatelessWidget {
  const LearnHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LearnHub',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)), useMaterial3: true),
      home: const LoginScreen(),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final otp = TextEditingController();
  String? error;

  void enter(String name) {
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => MarketScreen(name: name)));
  }

  void byEmail() {
    if (!email.text.contains('@') || otp.text.trim().length < 4) {
      setState(() => error = 'Nhập email và mã OTP (từ 4 số).');
      return;
    }
    enter(email.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đăng nhập LearnHub')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('Đăng nhập bằng email và OTP, hoặc tài khoản Google / Apple.'),
          const SizedBox(height: 12),
          TextField(controller: email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
          TextField(controller: otp, decoration: const InputDecoration(labelText: 'Mã OTP'), keyboardType: TextInputType.number),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(error!, style: const TextStyle(color: Colors.red))),
          const SizedBox(height: 12),
          FilledButton(onPressed: byEmail, child: const Text('Đăng nhập bằng OTP')),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => enter('Google · student'), child: const Text('Tiếp tục với Google')),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => enter('Apple · student'), child: const Text('Tiếp tục với Apple')),
        ],
      ),
    );
  }
}

class MarketScreen extends StatelessWidget {
  const MarketScreen({super.key, required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chợ khóa học'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => InboxScreen(name: name))),
            icon: const Icon(Icons.chat_bubble_outline),
          ),
        ],
      ),
      body: ListView(
        children: [
          ListTile(title: Text('Xin chào $name')),
          for (final course in courses)
            ListTile(
              title: Text(course.title),
              subtitle: Text('${course.shop} · ${course.city} · ${course.level}'),
              trailing: Text('${course.price} đ'),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => DetailScreen(course: course, name: name))),
            ),
        ],
      ),
    );
  }
}

class DetailScreen extends StatelessWidget {
  const DetailScreen({super.key, required this.course, required this.name});
  final Course course;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(course.title)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(course.shop, style: Theme.of(context).textTheme.titleMedium),
            Text('${course.city} · Trình độ ${course.level}'),
            const SizedBox(height: 8),
            Text('${course.price} đ'),
            const SizedBox(height: 16),
            const Text('Nguồn nội dung: giảng viên tự soạn. Khóa học trên LearnHub, không phải tin máy.'),
            const Spacer(),
            FilledButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => ChatScreen(title: course.shop, name: name, about: course.title),
              )),
              child: const Text('Chat với shop'),
            ),
          ],
        ),
      ),
    );
  }
}

class InboxScreen extends StatelessWidget {
  const InboxScreen({super.key, required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tin nhắn')),
      body: ListView(
        children: [
          for (final course in courses)
            ListTile(
              title: Text(course.shop),
              subtitle: Text(course.title),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => ChatScreen(title: course.shop, name: name, about: course.title),
              )),
            ),
          ListTile(
            title: const Text('Admin LearnHub'),
            subtitle: const Text('Hỏi về mở khóa và hoàn MoMo'),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => ChatScreen(title: 'Admin', name: name, about: 'tài khoản'),
            )),
          ),
        ],
      ),
    );
  }
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.title, required this.name, required this.about});
  final String title;
  final String name;
  final String about;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController();
  final lines = <String>['Shop: Bạn cần hỏi học phí, lịch học hay chứng chỉ?'];

  void send() {
    final text = input.text.trim();
    if (text.isEmpty) return;
    setState(() {
      lines.add('${widget.name}: $text');
      lines.add('${widget.title}: Đã nhận tin về ${widget.about}.');
      input.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          Expanded(child: ListView(padding: const EdgeInsets.all(12), children: [for (final line in lines) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(line))])),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(child: TextField(controller: input, decoration: const InputDecoration(hintText: 'Nhắn tin'))),
                IconButton(onPressed: send, icon: const Icon(Icons.send)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
