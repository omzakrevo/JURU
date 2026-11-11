import 'package:flutter/material.dart';
import '../../core/format.dart';
import '../../core/supabase.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});
  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  late Future<List<Map<String, dynamic>>> _f;
  @override
  void initState() { super.initState(); _f = _load(); }
  Future<List<Map<String, dynamic>>> _load() async =>
      ((await db.from('notifications').select().eq('channel', 'in_app').order('created_at', ascending: false).limit(100)) as List).cast<Map<String, dynamic>>();

  @override
  Widget build(BuildContext context) => FutureBuilder<List<Map<String, dynamic>>>(
        future: _f,
        builder: (c, s) {
          if (s.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
          if (s.hasError) return Center(child: Text(rpcMessage(s.error!)));
          final rows = s.data!;
          return Column(children: [
            Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () async { await db.rpc('mark_notifications_read'); setState(() => _f = _load()); }, child: const Text('Tout marquer comme lu'))),
            Expanded(child: rows.isEmpty ? const Center(child: Text('Aucune notification')) : ListView(children: [
              for (final n in rows)
                ListTile(
                  leading: Icon(Icons.circle, size: 10, color: n['read_at'] == null ? Colors.green : Colors.transparent),
                  title: Text(n['title'] as String, style: TextStyle(fontWeight: n['read_at'] == null ? FontWeight.w700 : FontWeight.w400)),
                  subtitle: Text('${n['body']}\n${formatDate(n['created_at'] as String)}'),
                  isThreeLine: true,
                ),
            ])),
          ]);
        },
      );
}
