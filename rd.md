## 项目概述
放在最下面的SQL语句可以拿出系统用户被销售的跟进情况，这些用户都是单身想要找对象的用户，需要我们打电话，电话的主要目的是了解他们的基本情况并且邀约他到我们的门店，我们想要基于这些做一个数据分析看板。

## 指标定义
以下SQL语句查询出来的字段的含义：mid用户ID，createtime是用户入库时间，mobile用户手机号码，sitename是用户被分配的门店，addtime是用户被销售跟进的时间，sourcefrom代表用户的引流渠道ID（这个是引流渠道的ID，需要根据ID去关联对应的引流渠道的中文简称，下方的看板使用这个引流渠道简称），logcont是用户被跟进的情况，一个用户会在不同的时间被跟进多次，所以一个用户会有多条跟进记录。

### 引流渠道对应关系：
    1#网站注册|2#人工录入|3#资源导入|4#相亲活动|5#手机来电|6#表单填写|7#到店咨询|8#抖音|9#脱单小程序|10#小红书|11#Soul|12#视频号|13#微博|14#视频号脱单小程序|15#哔哩哔哩脱单小程序|16#哔哩哔哩|17#知乎脱单小程序|18#微博脱单小程序|19#广点通|20#小红书投放表单|21#探探|22#投放微信视频号|23#投放微博表单|24#投放抖音|25#投放抖音表单|26#投放微信朋友圈|27#投放知乎表单|28#投放哔哩哔哩表单|29#投放小红书表单|30#投放微博|31#投放知乎|32#投放哔哩哔哩|33#投放公众号|34#投放公众号大V|35#投放微信朋友圈表单|36#投放脱单小程序|37#投放脱单联盟CAPP|38#投放脱单小程序|39#投放脱单联盟CAPP|40#投放优酷表单|42#优酷|43#橙APP|44#知乎|45#豆瓣|46#直播|48#投放视频号直播|49#视频号直播|50#运营Soul|51#运营小红书|52#运营抖音|53#运营|54#员工号|55#投放支付宝|56#投放支付宝表单|57#运营知乎|58#运营哔哩哔哩|59#小程序搜索广告|60#小程序广告搜索|61#投放小红书|62#网罗灯下黑（小程序）

## 分析

根据跟进情况分析用户的接通率、可跟进率、深度沟通率

### 看板注意点
    1、当用户点击提取数据分析，开始连接数据库并且运营SQL提取数据，提取完成后开始分析，需要在网页上展示具体的进度
    2、不管用户刷新还是重新打开网站，数据保持上一次分析数据，不要清除分析的内容，只有点击提取数据分析按钮才会重新生成数据

## 数据库连接：

### Mysql
    连接：sh-cdb-41628zog.sql.tencentcdb.com 
    端口：23800 
    数据库：oe_service_prd
    账户名：oe_service_prd  
    密码：Oeservice45698#$%. 

### 查询SQL语句：
    select 
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
    on msiteid = fsiteid