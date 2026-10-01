/**
 * API路径映射表
 * -------------------------------------------------
 * 将前端旧式调用(file.php?action=xxx) 映射到 PHP 后端 RESTful 路由
 * PHP 后端统一入口: /api/index.php/{module}/{action}
 * 例如: user.php?action=login  ->  auth/login
 *       post.php?action=list   ->  post/list
 *
 * path 是相对于 baseUrl 的路径(不含 /api/ 前缀)
 * method: GET / POST
 *
 * 说明:
 *  - 后端已有真实实现的 action, 直接映射到对应 module/action
 *  - 后端暂未实现的扩展功能, 映射到后端提供的 stub 模块(返回空/未开放), 保证前端不崩溃
 */

const apiMap = {
  // ==================== user.php ====================
  'user.php': {
    // 认证
    'login': ['auth/login', 'POST'],
    'register': ['auth/register', 'POST'],
    'phoneLogin': ['auth/phone_login', 'POST'],
    'sendPhoneSmsCode': ['auth/send_phone_sms_code', 'POST'],
    'emailLogin': ['auth/email_login', 'POST'],
    'registerWithEmail': ['auth/register_with_email', 'POST'],
    'sendRegisterEmailCode': ['auth/send_email_code', 'POST'],
    'sendEmailLoginCode': ['auth/send_email_code', 'POST'],
    'logout': ['auth/logout', 'POST'],
    'forget_check_username': ['auth/forgot/reset', 'POST'],
    'forget_send_verify_code': ['auth/forgot/reset', 'POST'],
    'forget_check_verify_code': ['auth/forgot/reset', 'POST'],
    'forget_reset_password': ['auth/forgot/reset', 'POST'],
    'oauthLogin': ['auth/oauth', 'POST'],
    'oauthLoginPinhao': ['auth/pinhao_login', 'POST'],
    // 资料
    'getUserInfo': ['auth/me', 'GET'],
    'getProfile': ['user/profile', 'GET'],
    'profileHome': ['user/profile', 'GET'],
    'profileHomeBundle': ['user/profileHomeBundle', 'GET'],
    'getOtherUserInfo': ['user/profile', 'GET'],
    'getOtherUserPosts': ['user/getOtherUserPosts', 'GET'],
    'myHomeBundle': ['auth/me', 'GET'],
    'update': ['user/update', 'POST'],
    'updateUserInfo': ['user/update', 'POST'],
    'updateNickname': ['user/update', 'POST'],
    'updateSignature': ['user/update', 'POST'],
    'updateUsername': ['user/update', 'POST'],
    'update_avatar': ['user/update', 'POST'],
    'updateAvatar': ['user/update', 'POST'],
    'update_background': ['user/update', 'POST'],
    'updateBackground': ['user/update', 'POST'],
    'update_privacy_setting': ['user/privacy', 'POST'],
    'change_password': ['user/change_password', 'POST'],
    'changePassword': ['user/change_password', 'POST'],
    'getAccountSecurity': ['user/account_security', 'GET'],
    'sendEmailCode': ['user/send_email_code', 'POST'],
    'bindEmail': ['user/bind_email', 'POST'],
    'changeEmail': ['user/change_email', 'POST'],
    'sendPayPwdEmailCode': ['user/pay_password', 'POST'],
    'verifyPayPwdEmailCode': ['user/pay_password', 'POST'],
    'setPayPassword': ['user/pay_password', 'POST'],
    'verifyPayPassword': ['user/pay_password', 'POST'],
    'sendBindPhoneSmsCode': ['user/bind_phone', 'POST'],
    'bindPhone': ['user/bind_phone', 'POST'],
    'getBindSocialUrl': ['user/social', 'POST'],
    'bindSocial': ['user/social', 'POST'],
    'unbindSocial': ['user/social', 'POST'],
    'savePushToken': ['user/push_token', 'POST'],
    'checkCanMessage': ['user/check_can_message', 'GET'],
    'getCertificationCenter': ['user/certification', 'GET'],
    'submitCertification': ['user/certification', 'POST'],
    'getRecommendUsers': ['user/recommend', 'GET'],
    // 关注
    'getMyFans': ['user/followers', 'GET'],
    'getMyFollows': ['user/following', 'GET'],
    'mutual': ['user/mutual', 'GET'],
    'toggleFollow': ['user/follow', 'POST'],
    'dismissRecommendUser': ['user/recommend', 'POST'],
    // 搜索
    'searchUser': ['user/search', 'GET'],
    // 我的内容
    'myPosts': ['post/my', 'GET'],
    'getMyPosts': ['post/my', 'GET'],
    'myLikedPosts': ['post/my_liked', 'GET'],
    'getMyLikedPosts': ['post/my_liked', 'GET'],
    // 版本
    'checkUpdate': ['system/settings', 'GET'],
    'getVipInfo': ['vip/info', 'GET'],
  },

  // ==================== post.php ====================
  'post.php': {
    'get_runtime_config': ['system/settings', 'GET'],
    'list': ['post/list', 'GET'],
    'detail': ['post/detail', 'GET'],
    'search': ['post/search', 'GET'],
    'zhiding': ['post/hot', 'GET'],
    'getFollowList': ['post/list', 'GET'],
    'classifications': ['post/classifications', 'GET'],
    'publish': ['post/create', 'POST'],
    'updatePost': ['post/update', 'POST'],
    'deletePost': ['post/delete', 'POST'],
    'user_delete_post': ['post/delete', 'POST'],
    'like': ['post/like', 'POST'],
    'checkLike': ['post/check_like', 'GET'],
    'browse': ['post/browse', 'POST'],
    'collect': ['post/collect', 'POST'],
    'comment': ['post/comment', 'POST'],
    'addComment': ['post/comment', 'POST'],
    'getCommentList': ['post/comments', 'GET'],
    'deleteComment': ['post/comment/delete', 'POST'],
    'likeComment': ['post/comment/like', 'POST'],
    'pinComment': ['post/pinComment', 'POST'],
    'unpinComment': ['post/unpinComment', 'POST'],
    'buy_post': ['post/buy', 'POST'],
    'reward_post': ['wallet/tip/send', 'POST'],
    'get_rewarders': ['post/rewarders', 'GET'],
    'unlock_by_comment': ['post/unlock', 'POST'],
    'delete_file': ['post/delete_file', 'POST'],
    'searchUser': ['user/search', 'GET'],
    'userInfo': ['user/profile', 'GET'],
    'moderatePostStatus': ['post/update', 'POST'],
    'moderatorDelete': ['post/moderatorDelete', 'POST'],
  },

  // ==================== message.php (聊天) ====================
  'message.php': {
    'getMessageIndex': ['chat/index', 'GET'],
    'getChats': ['chat/index', 'GET'],
    'getChatProfile': ['user/profile', 'GET'],
    'getChatDetail': ['chat/messages', 'GET'],
    'getMessages': ['chat/messages', 'GET'],
    'sendMsg': ['chat/send', 'POST'],
    'send_message': ['chat/send', 'POST'],
    'send_image': ['chat/send', 'POST'],
    'markChatRead': ['chat/read', 'POST'],
    'markAllRead': ['chat/read', 'POST'],
    'clearChatHistory': ['chat/clear', 'POST'],
    'deleteChat': ['chat/delete', 'POST'],
    'recallMsg': ['chat/recall', 'POST'],
    'operateChat': ['chat/read', 'POST'],
    'setChatBackground': ['chat/setting', 'POST'],
    'setBlock': ['chat/setting', 'POST'],
    'checkMyStyle': ['chat/setting', 'GET'],
    'getWsStatus': ['chat/setting', 'GET'],
    'getUserOnline': ['chat/setting', 'GET'],
    'getLogEnable': ['chat/setting', 'GET'],
    'setLogEnable': ['chat/setting', 'POST'],
    'searchChatMessages': ['chat/messages', 'GET'],
    // 红包 / 转账
    'sendRedPacket': ['wallet/redpacket/send', 'POST'],
    'receiveRedPacket': ['wallet/redpacket/grab', 'POST'],
    'redpacketDetail': ['wallet/redpacket/detail', 'GET'],
    'sendTransfer': ['wallet/transfer/send', 'POST'],
    'receiveTransfer': ['wallet/redpacket/grab', 'POST'],
    'transfer': ['wallet/transfer/send', 'POST'],
    // 名片 / 表情
    'sendCard': ['chat/send_card', 'POST'],
    'getFriendsForCard': ['user/following', 'GET'],
    'get_default_emoticons': ['chat/emoticons', 'GET'],
    'get_favorite_emoticons': ['chat/emoticons', 'GET'],
    'delete_favorite_emoticon': ['chat/emoticons', 'POST'],
    'upload_custom_emoticon': ['chat/emoticons', 'POST'],
    'add_favorite_emoticon': ['chat/emoticons', 'POST'],
    'add_favorite': ['chat/emoticons', 'POST'],
    'remove_favorite': ['chat/emoticons', 'POST'],
    // 通知
    'getNotificationList': ['notification/list', 'GET'],
    'getSystemNotices': ['notification/system', 'GET'],
    'clearSpecificNotifications': ['notification/clear/all', 'POST'],
    'deleteAllNotices': ['notification/clear/all', 'POST'],
    'deleteNotice': ['notification/clear/all', 'POST'],
    'markNoticeRead': ['notification/read/all', 'POST'],
    'getChatProfileById': ['user/profile', 'GET'],
  },

  // ==================== group.php (群聊) ====================
  'group.php': {
    'group_list': ['chat/sessions', 'GET'],
    'group_info': ['chat/group_info', 'GET'],
    'group_create': ['chat/group/create', 'POST'],
    'group_dissolve': ['chat/group_dissolve', 'POST'],
    'group_apply_join': ['chat/group_join', 'POST'],
    'group_invite': ['chat/group_join', 'POST'],
    'group_join': ['chat/group_join', 'POST'],
    'group_join_decline': ['chat/group_join_decline', 'POST'],
    'group_join_request_list': ['chat/group_join_requests', 'GET'],
    'group_join_request_review': ['chat/group_join_review', 'POST'],
    'group_kick': ['chat/group_kick', 'POST'],
    'group_leave': ['chat/group_leave', 'POST'],
    'group_mark_all_read': ['chat/read', 'POST'],
    'group_mark_read': ['chat/read', 'POST'],
    'group_member_list': ['chat/members', 'GET'],
    'group_msg_list': ['chat/messages', 'GET'],
    'group_msg_recall': ['chat/recall', 'POST'],
    'group_msg_send': ['chat/send', 'POST'],
    'group_send_redpacket': ['wallet/redpacket/send', 'POST'],
    'group_receive_redpacket': ['wallet/redpacket/grab', 'POST'],
    'group_redpacket_detail': ['wallet/redpacket/detail', 'GET'],
    'group_search_by_identity': ['chat/group_search', 'GET'],
    'group_search': ['chat/group_search', 'GET'],
    'group_set_announcement': ['chat/group_setting', 'POST'],
    'group_set_avatar': ['chat/group_setting', 'POST'],
    'group_set_join_need_approve': ['chat/group_setting', 'POST'],
    'group_set_member_mute': ['chat/group_setting', 'POST'],
    'group_set_member_role': ['chat/group_setting', 'POST'],
    'group_set_mute_all': ['chat/group_setting', 'POST'],
    'group_update_name': ['chat/group_setting', 'POST'],
    'mutual_follow_list': ['user/mutual', 'GET'],
  },

  // ==================== circle.php (圈子) ====================
  'circle.php': {
    'list': ['circle/list', 'GET'],
    'detail': ['circle/detail', 'GET'],
    'categories': ['circle/categories', 'GET'],
    'toggleJoin': ['circle/join', 'POST'],
    'getMembers': ['circle/members', 'GET'],
    'get_circle_moderators': ['circle/get_circle_moderators', 'GET'],
    'add_circle_moderator': ['circle/add_circle_moderator', 'POST'],
    'remove_circle_moderator': ['circle/remove_circle_moderator', 'POST'],
    'get_user_moderator_circles': ['circle/get_user_moderator_circles', 'GET'],
  },

  // ==================== dynamic.php (动态) ====================
  'dynamic.php': {
    'list': ['moment/list', 'GET'],
    'detail': ['moment/detail', 'GET'],
    'publish': ['moment/create', 'POST'],
    'like': ['moment/like', 'POST'],
    'getComments': ['moment/comments', 'GET'],
    'addComment': ['moment/comment', 'POST'],
    'delete': ['moment/delete', 'POST'],
    'update': ['moment/update', 'POST'],
    'myList': ['moment/my', 'GET'],
  },

  // ==================== topic.php ====================
  'topic.php': {
    'list': ['circle/list', 'GET'],
  },

  // ==================== software.php ====================
  'software.php': {
    'get_runtime_config': ['system/settings', 'GET'],
    'get_categories': ['software/categories', 'GET'],
    'get_channels': ['software/tags', 'GET'],
    'get_tags': ['software/tags', 'GET'],
    'get_list': ['software/list', 'GET'],
    'get_detail': ['software/detail', 'GET'],
    'get_comments': ['software/comments', 'GET'],
    'add_comment': ['software/add_comment', 'POST'],
    'download': ['software/download', 'GET'],
    'save': ['software/create', 'POST'],
    'publish': ['software/create', 'POST'],
    'update': ['software/update', 'POST'],
    'update_status': ['software/off_shelf', 'POST'],
    'relist': ['software/relist', 'POST'],
    'delete': ['software/delete', 'POST'],
    'delete_file': ['software/delete_file', 'POST'],
    'my_pub': ['software/my', 'GET'],
    'reward': ['wallet/tip/send', 'POST'],
    'off_shelf': ['software/off_shelf', 'POST'],
  },

  // ==================== market.php (商城) ====================
  'market.php': {
    'get_categories': ['market/categories', 'GET'],
    'get_runtime_config': ['market/config', 'GET'],
    'get_list': ['market/list', 'GET'],
    'get_detail': ['market/get_detail', 'GET'],
    'get_user_products': ['market/list', 'GET'],
    'my_pub': ['market/my_pub', 'GET'],
    'buy': ['market/buy', 'POST'],
    'publish': ['market/create', 'POST'],
    'update': ['market/update', 'POST'],
    'my_product_detail': ['market/my_product_detail', 'GET'],
    'categories_admin': ['market/categories_admin', 'GET'],
    'category_create': ['market/category_create', 'POST'],
    'category_update': ['market/category_update', 'POST'],
    'category_delete': ['market/category_delete', 'POST'],
    'off_shelf': ['market/off_shelf', 'POST'],
    'relist': ['market/relist', 'POST'],
    'delete': ['market/delete', 'POST'],
    'my_orders': ['market/my_orders', 'GET'],
    'ship': ['market/ship', 'POST'],
    'confirm_receipt': ['market/confirm', 'POST'],
    'refund': ['market/refund', 'POST'],
    'delete_order': ['market/delete_order', 'POST'],
    'get_logistics': ['market/get_logistics', 'GET'],
    'send_virtual': ['market/send_virtual', 'POST'],
    'delete_file': ['market/delete_file', 'POST'],
    'check_withdraw': ['wallet/balance', 'GET'],
  },

  // ==================== wallet.php ====================
  'wallet.php': {
    'get_wallet': ['wallet/balance', 'GET'],
    'get_balance': ['wallet/balance', 'GET'],
    'get_logs': ['wallet/logs', 'GET'],
    'create_order': ['wallet/recharge', 'POST'],
    'check_status': ['wallet/check_status', 'GET'],
    'clean_logs': ['wallet/clean_logs', 'POST'],
    'redeem_card': ['wallet/redeem_card', 'POST'],
  },

  // ==================== withdraw.php (提现) ====================
  'withdraw.php': {
    'get_fee_rate': ['withdraw/fee_rate', 'GET'],
    'apply': ['withdraw/apply', 'POST'],
    'get_my_requests': ['withdraw/my_requests', 'GET'],
    'cancel': ['withdraw/cancel', 'POST'],
  },

  // ==================== vip.php ====================
  'vip.php': {
    'getVipInfo': ['vip/info', 'GET'],
    'upgrade': ['vip/buy', 'POST'],
  },

  // ==================== mall.php / bubble.php / fancy.php (装扮) ====================
  'mall.php': {
    'getMallData': ['user/frames/all', 'GET'],
    'buyFrame': ['user/frames/purchase', 'POST'],
    'wearFrame': ['user/frames/switch', 'POST'],
  },
  'bubble.php': {
    'list': ['bubble/list', 'GET'],
    'buy': ['bubble/buy', 'POST'],
    'equip': ['bubble/equip', 'POST'],
  },
  'fancy.php': {
    'getMyNumber': ['fancy/my_number', 'GET'],
    'getList': ['fancy/list', 'GET'],
    'buy': ['fancy/buy', 'POST'],
    'user_number': ['fancy/user_number', 'GET'],
  },

  // ==================== task.php ====================
  'task.php': {
    'getTaskList': ['task/list', 'GET'],
    'claimReward': ['task/claim', 'POST'],
  },

  // ==================== checkin.php (签到) ====================
  'checkin.php': {
    'get_status': ['checkin/status', 'GET'],
    'status': ['checkin/status', 'GET'],
    'do': ['checkin/do', 'POST'],
    'checkin': ['checkin/do', 'POST'],
    'get_logs': ['checkin/logs', 'GET'],
    'logs': ['checkin/logs', 'GET'],
    'get_points_logs': ['checkin/points/logs', 'GET'],
    'points_logs': ['checkin/points/logs', 'GET'],
  },

  // ==================== report.php (举报) ====================
  'report.php': {
    'submit': ['report/create', 'POST'],
    'create': ['report/create', 'POST'],
    'my': ['report/my', 'GET'],
    'blacklist': ['report/blacklist', 'GET'],
  },

  // ==================== banner.php ====================
  'banner.php': {
    'list': ['system/carousels', 'GET'],
  },

  // ==================== app.php ====================
  'app.php': {
    'check_update': ['system/settings', 'GET'],
    'checkUpdate': ['system/settings', 'GET'],
  },

  // ==================== games / rps / duel ====================
  'duel_game.php': {
    'start_duel': ['games/duel_start', 'POST'],
    'cancel_duel': ['games/duel_cancel', 'POST'],
    'accept_duel': ['games/duel_accept', 'POST'],
    'check_duel': ['games/duel_check', 'GET'],
    'end_duel': ['games/duel_end', 'POST'],
    'get_challenges': ['games/duel_challenges', 'GET'],
    'get_history': ['games/duel_history', 'GET'],
    'get_score': ['games/duel_score', 'GET'],
  },
  'extensions/rps_game.php': {
    'get_user_score': ['games/rps_score', 'GET'],
    'bet': ['games/rps_bet', 'POST'],
    'current_round': ['games/rps_round', 'GET'],
    'history': ['games/rps_history', 'GET'],
    'my_history': ['games/rps_history', 'GET'],
    'get_settings': ['games/rps_settings', 'GET'],
    'save_settings': ['games/rps_settings', 'POST'],
  },
  'extensions/redpacket.php': {
    'available': ['wallet/redpacket/available', 'GET'],
    'claim': ['wallet/redpacket/grab', 'POST'],
  },
  'rps_game.php': {
    'score_ranking': ['games/rps_ranking', 'GET'],
  },
  'games.php': {
    'list': ['games/list', 'GET'],
  },

  // ==================== douyin.php ====================
  'douyin.php': {
    'parse': ['douyin/parse', 'GET'],
    'test': ['douyin/test', 'GET'],
  },

  // ==================== upload.php ====================
  'upload.php': {
    '': ['upload/image', 'POST'],
    'image': ['upload/image', 'POST'],
    'avatar': ['upload/avatar', 'POST'],
    'post_img': ['upload/post_img', 'POST'],
  },

  // ==================== 前端内置 Web 管理端 ====================
  'auth.php': {
    'login': ['auth/login', 'POST'],
    'logout': ['auth/logout', 'POST'],
    'token_login': ['auth/login', 'POST'],
    'unlock_admin': ['auth/login', 'POST'],
    'change_password': ['user/change_password', 'POST'],
  },
  'misc.php': {
    'get_misc_list': ['admin_misc/list', 'GET'],
    'edit_misc': ['admin_misc/update', 'POST'],
    'add_misc': ['admin_misc/create', 'POST'],
    'delete_misc': ['admin_misc/delete', 'POST'],
    'get_circle_moderators': ['circle/get_circle_moderators', 'GET'],
    'search_circle_moderator_users': ['user/search', 'GET'],
    'add_circle_moderator': ['circle/add_circle_moderator', 'POST'],
    'remove_circle_moderator': ['circle/remove_circle_moderator', 'POST'],
    'circle_category_list': ['admin_misc/circle_category_list', 'GET'],
    'circle_category_create': ['admin_misc/circle_category_create', 'POST'],
    'circle_category_update': ['admin_misc/circle_category_update', 'POST'],
    'circle_category_delete': ['admin_misc/circle_category_delete', 'POST'],
  },
  'posts.php': {
    'get_posts': ['post/list', 'GET'],
    'get_post_detail': ['post/detail', 'GET'],
    'update_post_status': ['post/update', 'POST'],
    'toggle_post_top': ['post/update', 'POST'],
    'delete_post': ['post/delete', 'POST'],
  },
  'users.php': {
    'get_users': ['admin/users', 'GET'],
    'get_vip_users': ['admin/users', 'GET'],
    'get_banned_users': ['admin/users', 'GET'],
    'get_user_detail': ['admin/users', 'GET'],
    'update_user_full': ['admin/user/update', 'POST'],
    'ban_user': ['admin/user/update', 'POST'],
    'unban_user': ['admin/user/update', 'POST'],
    'grant_vip': ['admin/user/update', 'POST'],
    'reset_password': ['admin/user/update', 'POST'],
    'delete_user': ['admin/user/delete', 'POST'],
  },
  'comments.php': {
    'get_comments': ['admin/comments', 'GET'],
    'update_comment_status': ['admin/comments', 'POST'],
    'delete_comment': ['admin/comments', 'POST'],
  },
  'dashboard.php': {
    'get_stats': ['admin/stats', 'GET'],
  },
  'reports.php': {
    'get_reports': ['admin/reports', 'GET'],
    'handle_report': ['admin/reports', 'POST'],
    'reply_report': ['admin/reports', 'POST'],
    'ignore_report': ['admin/reports', 'POST'],
    'unhide_post': ['admin/reports', 'POST'],
    'take_down': ['admin/reports', 'POST'],
    'ban_user': ['admin/reports', 'POST'],
  },
  'certifications.php': {
    'list': ['admin/certifications', 'GET'],
    'review': ['admin/certifications', 'POST'],
    'delete': ['admin/certifications', 'POST'],
  },
  'groups.php': {
    'search_groups': ['chat/sessions', 'GET'],
    'list_groups': ['chat/sessions', 'GET'],
    'get_group_members': ['chat/members', 'GET'],
    'get_join_requests': ['chat/group_join_requests', 'GET'],
    'get_group_messages': ['chat/messages', 'GET'],
    'review_join_request': ['chat/group_join_review', 'POST'],
    'mute_member': ['chat/group_setting', 'POST'],
    'kick_member': ['chat/group_kick', 'POST'],
    'dissolve_group': ['chat/group_dissolve', 'POST'],
  },
  'system_notices.php': {
    'get_list': ['notification/system', 'GET'],
    'send': ['notification/system', 'POST'],
    'delete': ['notification/system', 'POST'],
  },
  'logs.php': {
    'get_admin_logs': ['admin/logs', 'GET'],
    'get_sys_logs': ['admin/logs', 'GET'],
  },
  'versions.php': {
    'get_app_versions': ['system/settings', 'GET'],
    'get_app_version_detail': ['system/settings', 'GET'],
    'save': ['system/settings', 'POST'],
    'update': ['system/settings', 'POST'],
    'delete_app_version': ['system/settings', 'POST'],
  },
  'bubbles.php': {
    'get_bubbles': ['bubble/list', 'GET'],
    'delete_bubble': ['bubble/delete', 'POST'],
    'create': ['bubble/create', 'POST'],
    'update': ['bubble/update', 'POST'],
  },
  'admin_fancy.php': {
    'get_list': ['fancy/list', 'GET'],
    'add': ['fancy/add', 'POST'],
    'update': ['fancy/update', 'POST'],
    'release': ['fancy/release', 'POST'],
    'delete': ['fancy/delete', 'POST'],
  },
  'admin_market.php': {
    'get_stats': ['market/stats', 'GET'],
    'get_products': ['market/list', 'GET'],
    'update_product_status': ['market/update', 'POST'],
    'delete_product': ['market/delete', 'POST'],
    'get_orders': ['market/orders', 'GET'],
    'refund_order': ['market/refund', 'POST'],
    'delete_order': ['market/delete_order', 'POST'],
    'get_logistics_admin': ['market/logistics', 'POST'],
  },
  'recharge_orders.php': {
    'get_recharge_orders': ['wallet/logs', 'GET'],
    'refund_recharge_order': ['wallet/logs', 'POST'],
    'delete_recharge_order': ['wallet/logs', 'POST'],
    'clear_unpaid_recharge_orders': ['wallet/logs', 'POST'],
  },
  'withdrawals.php': {
    'get_list': ['withdraw/my_requests', 'GET'],
    'get_user_logs': ['wallet/logs', 'GET'],
    'approve': ['withdraw/apply', 'POST'],
    'reject': ['withdraw/apply', 'POST'],
  },
  'settings.php': {
    'get_settings': ['system/settings', 'GET'],
    'save_settings': ['system/settings', 'POST'],
    'change_admin_password': ['user/change_password', 'POST'],
    'send_test_email': ['system/settings', 'POST'],
    'test_cos_connection': ['system/settings', 'POST'],
    'test_qiniu_connection': ['system/settings', 'POST'],
    'get_all': ['admin/settings', 'GET'],
    'save': ['admin/settings/update', 'POST'],
  },
  'tokens.php': {
    'get_user_tokens': ['admin/users', 'GET'],
    'delete_token': ['admin/user/delete', 'POST'],
    'clean_expired_tokens': ['admin/user/delete', 'POST'],
  },
  'terminal_config.php': {
    'get_config': ['system/settings', 'GET'],
    'save_config': ['system/settings', 'POST'],
  },
  'market_categories.php': {
    'list': ['market/categories', 'GET'],
    'delete': ['market/update', 'POST'],
    'toggle_status': ['market/update', 'POST'],
  },
  'admin_software.php': {
    'get_list': ['admin/software', 'GET'],
    'get_detail': ['admin/software', 'GET'],
    'get_categories': ['software/categories', 'GET'],
    'save': ['software/create', 'POST'],
    'update': ['software/update', 'POST'],
    'update_status': ['software/off_shelf', 'POST'],
    'delete': ['software/delete', 'POST'],
  },
  'software_categories.php': {
    'list': ['software/categories', 'GET'],
    'create': ['software/category_create', 'POST'],
    'update': ['software/category_update', 'POST'],
    'toggle_status': ['software/category_update', 'POST'],
    'delete': ['software/category_delete', 'POST'],
    'channel_list': ['software/tags', 'GET'],
    'channel_create': ['software/tag_create', 'POST'],
    'channel_update': ['software/tag_update', 'POST'],
    'channel_toggle_status': ['software/tag_update', 'POST'],
    'channel_delete': ['software/tag_delete', 'POST'],
    'tag_list': ['software/tags', 'GET'],
    'tag_create': ['software/tag_create', 'POST'],
    'tag_update': ['software/tag_update', 'POST'],
    'tag_toggle_status': ['software/tag_update', 'POST'],
    'tag_delete': ['software/tag_delete', 'POST'],
  },
  'products.php': {
    'list': ['market/list', 'GET'],
    'create': ['market/create', 'POST'],
    'update': ['market/update', 'POST'],
    'delete': ['market/delete', 'POST'],
  },
  'orders.php': {
    'list': ['market/orders', 'GET'],
  },
  'chats.php': {
    'get_user_chats': ['chat/sessions', 'GET'],
    'get_chat_messages': ['chat/messages', 'GET'],
  },
  'violations.php': {
    'get_logs': ['admin/logs', 'GET'],
  },
  'frames.php': {
    'list': ['user/frames/all', 'GET'],
    'create': ['user/frames/purchase', 'POST'],
    'update': ['user/frames/switch', 'POST'],
    'delete': ['user/frames/switch', 'POST'],
  },
  'extensions/vip_card.php': {
    'list': ['vip_card/list', 'GET'],
    'generate': ['vip_card/generate', 'POST'],
    'delete': ['vip_card/delete', 'POST'],
    'clear_used': ['vip_card/clear_used', 'POST'],
    'prices': ['vip_card/prices', 'GET'],
    'user_vip': ['vip_card/user_vip', 'GET'],
    'buy': ['vip_card/buy', 'GET'],
    'redeem': ['vip_card/redeem', 'GET'],
  },
  'extensions/balance_card.php': {
    'list': ['balance_card/list', 'GET'],
    'generate': ['balance_card/generate', 'POST'],
    'disable': ['balance_card/disable', 'POST'],
    'delete': ['balance_card/delete', 'POST'],
    'clear_used': ['balance_card/clear_used', 'POST'],
  },
  'extensions/invite_code.php': {
    'list_codes': ['invite_code/list', 'GET'],
    'generate_codes': ['invite_code/generate_codes', 'POST'],
    'delete_code': ['invite_code/delete', 'POST'],
    'clear_used': ['invite_code/clear_used', 'POST'],
    // 账号注销
    'cancellation/submit': ['user/cancellation/submit', 'POST'],
    'cancellation/status': ['user/cancellation/status', 'GET'],
    'cancellation/cancel': ['user/cancellation/cancel', 'POST'],
  },
}

/**
 * 解析旧的PHP风格URL，提取filename和action
 * @param {string} url - 请求URL，如 'user.php' 或 'post.php?action=detail'
 * @param {object} data - 请求数据，可能包含action字段
 * @returns {{filename: string, action: string}}
 */
export function parseOldUrl(url, data = {}) {
  let filename = url
  let action = ''

  const qIdx = url.indexOf('?')
  if (qIdx >= 0) {
    filename = url.substring(0, qIdx)
    const queryStr = url.substring(qIdx + 1)
    const m = queryStr.match(/(^|&)action=([^&]*)/)
    if (m) action = decodeURIComponent(m[2])
  }

  if (!action && data.action) {
    action = String(data.action)
  }

  return { filename, action }
}

/**
 * 根据旧URL和data查找 PHP 后端 API 映射
 * @param {string} url - 请求URL
 * @param {object} data - 请求数据
 * @returns {{path: string, method: string}|null}
 */
export function resolveApiPath(url, data = {}) {
  const { filename, action } = parseOldUrl(url, data)

  const fileMap = apiMap[filename]
  if (!fileMap) return null

  if (action && fileMap[action]) {
    const [path, method] = fileMap[action]
    return { path, method }
  }

  if (!action && fileMap['']) {
    const [path, method] = fileMap['']
    return { path, method }
  }

  return null
}

export default apiMap