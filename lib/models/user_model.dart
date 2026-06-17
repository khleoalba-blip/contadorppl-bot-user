class UserModel {
  final String phone;
  final String name;
  final String token;

  UserModel({
    required this.phone,
    required this.name,
    required this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      phone: json['phone'] as String? ?? '',
      name: json['name'] as String? ?? '',
      token: token ?? json['token'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'phone': phone,
      'name': name,
    };
  }

  UserModel copyWith({
    String? phone,
    String? name,
    String? token,
  }) {
    return UserModel(
      phone: phone ?? this.phone,
      name: name ?? this.name,
      token: token ?? this.token,
    );
  }

  @override
  String toString() => 'UserModel(phone: $phone, name: $name)';
}
