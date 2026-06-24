const Transaction = require('../models/Transaction');
const User = require('../models/User');

const getRevenueStats = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    const now = new Date();
    let startDate = new Date();

    // Determine timeframe boundaries
    if (timeframe === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else if (timeframe === '12m') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      // Default '30d'
      startDate.setDate(now.getDate() - 30);
    }

    // A. Calculate Core KPIs
    // 1. Total Revenue (YTD) - All completed transactions in current calendar year
    const currentYear = now.getFullYear();
    const ytdStart = new Date(currentYear, 0, 1);
    const ytdResult = await Transaction.aggregate([
      { $match: { status: 'COMPLETED', date: { $gte: ytdStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenueYTD = ytdResult.length > 0 ? ytdResult[0].total : 0;

    // 2. MRR - Sum of subscription values for active users
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plans = await SubscriptionPlan.find({});
    const planPriceMap = {};
    plans.forEach(p => {
      planPriceMap[p.name.toLowerCase()] = p.price;
    });

    const users = await User.find({ status: 'Active' });
    let dynamicMRR = 0;
    users.forEach(u => {
      if (u.plan) {
        const userPlanKey = u.plan.toLowerCase();
        if (planPriceMap[userPlanKey] !== undefined) {
          dynamicMRR += planPriceMap[userPlanKey];
        }
      }
    });

    const mrr = dynamicMRR;
    const arr = mrr * 12;

    // 3. Conversion Rate - Percentage of users on paid plans
    const totalUsers = await User.countDocuments({});
    const paidPlanNames = plans.filter(p => p.price > 0).map(p => p.name);
    const paidUsers = await User.countDocuments({ plan: { $in: paidPlanNames } });
    const conversionRate = totalUsers > 0 ? parseFloat(((paidUsers / totalUsers) * 100).toFixed(1)) : 0;

    // Calculate Trends & Goals Progress dynamically
    // A. YTD Trend (Compare current YTD with previous year's YTD up to current day-of-year)
    const prevYearStart = new Date(currentYear - 1, 0, 1);
    const prevYearEnd = new Date(now);
    prevYearEnd.setFullYear(now.getFullYear() - 1);
    const prevYtdResult = await Transaction.aggregate([
      { $match: { status: 'COMPLETED', date: { $gte: prevYearStart, $lte: prevYearEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const prevYtdRevenue = prevYtdResult.length > 0 ? prevYtdResult[0].total : 0;
    let ytdTrendVal = 0;
    if (prevYtdRevenue > 0) {
      ytdTrendVal = ((totalRevenueYTD - prevYtdRevenue) / prevYtdRevenue) * 100;
    } else {
      ytdTrendVal = totalRevenueYTD > 0 ? 100 : 0;
    }
    const ytdTrend = `${ytdTrendVal >= 0 ? '+' : ''}${ytdTrendVal.toFixed(1)}%`;

    // B. MRR Trend (Compare current active MRR with active MRR 30 days ago)
    const prevUsers = await User.find({
      status: 'Active',
      createdAt: { $lt: startDate }
    });
    let prevMRR = 0;
    prevUsers.forEach(u => {
      if (u.plan) {
        const userPlanKey = u.plan.toLowerCase();
        if (planPriceMap[userPlanKey] !== undefined) {
          prevMRR += planPriceMap[userPlanKey];
        }
      }
    });
    let mrrTrendVal = 0;
    if (prevMRR > 0) {
      mrrTrendVal = ((dynamicMRR - prevMRR) / prevMRR) * 100;
    } else {
      mrrTrendVal = dynamicMRR > 0 ? 100 : 0;
    }
    const mrrTrend = `${mrrTrendVal >= 0 ? '+' : ''}${mrrTrendVal.toFixed(1)}%`;
    const arrTrend = mrrTrend;

    // C. Conversion Rate Trend (Compare current conversion rate with conversion rate 30 days ago)
    const totalUsers30d = await User.countDocuments({ createdAt: { $lt: startDate } });
    const paidUsers30d = await User.countDocuments({
      plan: { $in: paidPlanNames },
      createdAt: { $lt: startDate }
    });
    const conversionRate30d = totalUsers30d > 0 ? parseFloat(((paidUsers30d / totalUsers30d) * 100).toFixed(1)) : 0;
    let conversionTrendVal = conversionRate - conversionRate30d;
    const conversionTrend = `${conversionTrendVal >= 0 ? '+' : ''}${conversionTrendVal.toFixed(1)}%`;

    // D. Progress towards targets
    const TARGET_MRR = 1000;
    const TARGET_ARR = 12000;
    const TARGET_YTD = 25000;

    const mrrProgress = Math.min(100, Math.round((mrr / TARGET_MRR) * 100));
    const arrProgress = Math.min(100, Math.round((arr / TARGET_ARR) * 100));
    const ytdProgress = Math.min(100, Math.round((totalRevenueYTD / TARGET_YTD) * 100));
    const conversionProgress = Math.min(100, Math.round(conversionRate));

    // B. Calculate Chart Data
    // Group completed transactions in the timeframe by date
    const txListInTimeframe = await Transaction.find({
      status: 'COMPLETED',
      date: { $gte: startDate, $lte: now }
    }).sort({ date: 1 });

    // Grouping helper
    const groupedData = {};
    txListInTimeframe.forEach(tx => {
      let key;
      if (timeframe === '12m') {
        // Group by Month (Year-Month)
        key = tx.date.toLocaleString('default', { month: 'short', year: '2-digit' });
      } else {
        // Group by Date (Month Day)
        key = tx.date.toLocaleString('default', { month: 'short', day: 'numeric' });
      }
      groupedData[key] = (groupedData[key] || 0) + tx.amount;
    });

    const trendChart = Object.keys(groupedData).map(key => ({
      name: key,
      Revenue: groupedData[key]
    }));

    // C. Plan Breakdown
    const planAggregation = await Transaction.aggregate([
      { $match: { status: 'COMPLETED', date: { $gte: startDate } } },
      { $group: { _id: '$plan', value: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const planBreakdown = planAggregation.map(item => ({
      name: item._id,
      value: item.value,
      count: item.count
    }));

    // D. Acquisition Volume (new signups or paid checkouts over time)
    const acquisitionAggregation = {};
    txListInTimeframe.forEach(tx => {
      let key;
      if (timeframe === '12m') {
        key = tx.date.toLocaleString('default', { month: 'short' });
      } else {
        key = tx.date.toLocaleString('default', { month: 'short', day: 'numeric' });
      }
      acquisitionAggregation[key] = (acquisitionAggregation[key] || 0) + 1;
    });

    const acquisitionVolume = Object.keys(acquisitionAggregation).map(key => ({
      name: key,
      Volume: acquisitionAggregation[key]
    }));

    // E. Recent Transactions
    const recentTransactions = await Transaction.find({})
      .sort({ date: -1 })
      .limit(20);

    const formatValue = (val) => {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
      return `$${val}`;
    };

    res.status(200).json({
      stats: {
        mrr: formatValue(mrr),
        arr: formatValue(arr),
        totalRevenueYTD: formatValue(totalRevenueYTD),
        conversionRate: `${conversionRate}%`,
        totalUsers,
        mrrTrend,
        arrTrend,
        ytdTrend,
        conversionTrend,
        mrrProgress,
        arrProgress,
        ytdProgress,
        conversionProgress,
        rawMrr: mrr,
        rawArr: arr,
        rawYtd: totalRevenueYTD,
        rawConversion: conversionRate
      },
      trendChart,
      planBreakdown,
      acquisitionVolume,
      recentTransactions
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRevenueStats
};
