import 'package:flutter_test/flutter_test.dart';
import 'package:kredia/core/format.dart';

void main() {
  test('formatFcfa', () {
    expect(formatFcfa(150000), '150 000 FCFA');
    expect(formatFcfa(500), '500 FCFA');
    expect(formatFcfa(null), '—');
  });
  test('formatBps', () {
    expect(formatBps(1800), '18 %');
    expect(formatBps(1850), '18,50 %');
  });
  test('normalizePhoneBf', () {
    expect(normalizePhoneBf('70 12 34 56'), '+22670123456');
    expect(normalizePhoneBf('+226 70 12 34 56'), '+22670123456');
    expect(normalizePhoneBf('123'), isNull);
  });
  test('rpcMessage extrait le message métier', () {
    expect(rpcMessage('PostgrestException(message: KYC_REQUIRED: identité à vérifier, code: P0001)'), contains('identité'));
  });
}
