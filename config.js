const CONFIG = {
    database: {
        host: 'sh-cdb-41628zog.sql.tencentcdb.com',
        port: 23800,
        database: 'oe_service_prd',
        user: 'oe_service_prd',
        password: 'Oeservice45698#$%.'
    },
    query: `select
        mid,createtime,nickname,mobile,gender,ageyear,height,education,addtime,
        truename,sourcefrom,calltype,remark,pregiveupdes,pregiveups,pregiveupcat,sitename,logcont
        from
        (select
        mid,from_unixtime(addtime) as createtime,nickname,mobile,gender,ageyear,height,education,truename,sourcefrom,calltype,remark,pregiveupdes,pregiveups,pregiveupcat,siteid
        from oelv_pre_crm_member where from_unixtime(addtime,'%Y-%m-%d') > date('2025-08-01')
        and siteid in (13,337,327,378)
        ) as users
        left join
        (select from_unixtime(addtime) as addtime,logcont,mid as fmid,siteid as fsiteid,
        ROW_NUMBER() OVER (PARTITION BY mid ORDER BY addtime ASC) AS rn
        from oelv_pre_crm_follow2
        where from_unixtime(addtime,'%Y-%m-%d') > date('2025-08-01')
        and siteid in (13,337,327,378)
        ) as follow
        on fmid = users.mid and addtime >= createtime
        left join
        (select siteid as msiteid,sitename from oelv_pre_crm_site) as mendian
        on msiteid = fsiteid`,

    channelMapping: {
        1: '网站注册',
        2: '人工录入',
        3: '资源导入',
        4: '相亲活动',
        5: '手机来电',
        6: '表单填写',
        7: '到店咨询',
        8: '抖音',
        9: '脱单小程序',
        10: '小红书',
        11: 'Soul',
        12: '视频号',
        13: '微博',
        14: '视频号脱单小程序',
        15: '哔哩哔哩脱单小程序',
        16: '哔哩哔哩',
        17: '知乎脱单小程序',
        18: '微博脱单小程序',
        19: '广点通',
        20: '小红书投放表单',
        21: '探探',
        22: '投放微信视频号',
        23: '投放微博表单',
        24: '投放抖音',
        25: '投放抖音表单',
        26: '投放微信朋友圈',
        27: '投放知乎表单',
        28: '投放哔哩哔哩表单',
        29: '投放小红书表单',
        30: '投放微博',
        31: '投放知乎',
        32: '投放哔哩哔哩',
        33: '投放公众号',
        34: '投放公众号大V',
        35: '投放微信朋友圈表单',
        36: '投放脱单小程序',
        37: '投放脱单联盟CAPP',
        38: '投放脱单小程序',
        39: '投放脱单联盟CAPP',
        40: '投放优酷表单',
        42: '优酷',
        43: '橙APP',
        44: '知乎',
        45: '豆瓣',
        46: '直播',
        48: '投放视频号直播',
        49: '视频号直播',
        50: '运营Soul',
        51: '运营小红书',
        52: '运营抖音',
        53: '运营',
        54: '员工号',
        55: '投放支付宝',
        56: '投放支付宝表单',
        57: '运营知乎',
        58: '运营哔哩哔哩',
        59: '小程序搜索广告',
        60: '小程序广告搜索',
        61: '投放小红书',
        62: '网罗灯下黑（小程序）'
    }
};