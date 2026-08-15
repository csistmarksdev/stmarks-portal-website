class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.endpoint});

  final String message;
  final int? statusCode;
  final String? endpoint;

  @override
  String toString() => message;
}
