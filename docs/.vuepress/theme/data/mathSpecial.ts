export type MathSeriesKey = 'probability' | 'linear-algebra' | 'exam-linear-algebra' | 'calculus'

export const mathSeries = [
  {
    "key": "probability",
    "code": "PROB",
    "name": "概率论",
    "english": "PROBABILITY & STATISTICS",
    "summary": "从概率公理、随机变量和分布走向统计推断、信息论与概率模型。",
    "visual": {
      "label": "FOUNDATION / 01",
      "primary": "P(A|B)",
      "operator": "=",
      "secondary": "P(B|A)P(A) / P(B)",
      "caption": "PROBABILITY · CONDITION · INFERENCE"
    },
    "total": 21,
    "route": "/specials/math/notes/probability/00/",
    "groups": [
      {
        "name": "学习路线",
        "chapters": [
          {
            "title": "概率论学习路线",
            "order": 0,
            "code": "PROB.00",
            "route": "/specials/math/notes/probability/00/"
          }
        ]
      },
      {
        "name": "概率语言",
        "chapters": [
          {
            "title": "随机现象、样本空间与概率公理",
            "order": 1,
            "code": "PROB.01",
            "route": "/specials/math/notes/probability/01/"
          },
          {
            "title": "计数方法、组合概率与独立性",
            "order": 2,
            "code": "PROB.02",
            "route": "/specials/math/notes/probability/02/"
          },
          {
            "title": "条件概率、全概率公式与贝叶斯定理",
            "order": 3,
            "code": "PROB.03",
            "route": "/specials/math/notes/probability/03/"
          }
        ]
      },
      {
        "name": "随机变量与分布",
        "chapters": [
          {
            "title": "随机变量、分布函数与分位数",
            "order": 4,
            "code": "PROB.04",
            "route": "/specials/math/notes/probability/04/"
          },
          {
            "title": "联合分布、边缘分布与条件分布",
            "order": 5,
            "code": "PROB.05",
            "route": "/specials/math/notes/probability/05/"
          },
          {
            "title": "数学期望、方差、协方差与相关系数",
            "order": 6,
            "code": "PROB.06",
            "route": "/specials/math/notes/probability/06/"
          },
          {
            "title": "离散概率分布",
            "order": 7,
            "code": "PROB.07",
            "route": "/specials/math/notes/probability/07/"
          },
          {
            "title": "连续概率分布",
            "order": 8,
            "code": "PROB.08",
            "route": "/specials/math/notes/probability/08/"
          },
          {
            "title": "多元高斯分布与高斯条件分布",
            "order": 9,
            "code": "PROB.09",
            "route": "/specials/math/notes/probability/09/"
          },
          {
            "title": "随机变量函数与变量变换",
            "order": 10,
            "code": "PROB.10",
            "route": "/specials/math/notes/probability/10/"
          }
        ]
      },
      {
        "name": "极限定理与统计推断",
        "chapters": [
          {
            "title": "大数定律、中心极限定理与蒙特卡洛",
            "order": 11,
            "code": "PROB.11",
            "route": "/specials/math/notes/probability/11/"
          },
          {
            "title": "随机抽样、统计量与抽样分布",
            "order": 12,
            "code": "PROB.12",
            "route": "/specials/math/notes/probability/12/"
          },
          {
            "title": "参数估计、最大似然、MAP 与区间估计",
            "order": 13,
            "code": "PROB.13",
            "route": "/specials/math/notes/probability/13/"
          },
          {
            "title": "假设检验、p 值与多重比较",
            "order": 14,
            "code": "PROB.14",
            "route": "/specials/math/notes/probability/14/"
          },
          {
            "title": "贝叶斯推断、共轭先验与后验预测",
            "order": 15,
            "code": "PROB.15",
            "route": "/specials/math/notes/probability/15/"
          }
        ]
      },
      {
        "name": "信息、结构与序列",
        "chapters": [
          {
            "title": "信息论熵交叉熵KL散度与互信息",
            "order": 16,
            "code": "PROB.16",
            "route": "/specials/math/notes/probability/16/"
          },
          {
            "title": "指数族分布充分统计量与广义线性模型",
            "order": 17,
            "code": "PROB.17",
            "route": "/specials/math/notes/probability/17/"
          },
          {
            "title": "概率图模型隐变量与EM算法",
            "order": 18,
            "code": "PROB.18",
            "route": "/specials/math/notes/probability/18/"
          },
          {
            "title": "随机过程马尔可夫链与序列模型",
            "order": 19,
            "code": "PROB.19",
            "route": "/specials/math/notes/probability/19/"
          },
          {
            "title": "机器学习深度学习中的概率论",
            "order": 20,
            "code": "PROB.20",
            "route": "/specials/math/notes/probability/20/"
          }
        ]
      }
    ]
  },
  {
    "key": "linear-algebra",
    "code": "LALG",
    "name": "线性代数",
    "english": "LINEAR ALGEBRA FOR ML",
    "summary": "从向量和矩阵出发，串起空间、分解、表示学习、反向传播与数值稳定性。",
    "visual": {
      "label": "VECTOR / 01",
      "primary": "A x",
      "operator": "=",
      "secondary": "lambda x",
      "caption": "VECTOR · MATRIX · TRANSFORMATION"
    },
    "total": 20,
    "route": "/specials/math/notes/linear-algebra/00/",
    "groups": [
      {
        "name": "学习路线",
        "chapters": [
          {
            "title": "线性代数学习路线",
            "order": 0,
            "code": "LALG.00",
            "route": "/specials/math/notes/linear-algebra/00/"
          }
        ]
      },
      {
        "name": "对象与基本运算",
        "chapters": [
          {
            "title": "标量、向量、矩阵与张量",
            "order": 1,
            "code": "LALG.01",
            "route": "/specials/math/notes/linear-algebra/01/"
          },
          {
            "title": "向量运算、内积、范数与距离",
            "order": 2,
            "code": "LALG.02",
            "route": "/specials/math/notes/linear-algebra/02/"
          },
          {
            "title": "矩阵运算与特殊矩阵",
            "order": 3,
            "code": "LALG.03",
            "route": "/specials/math/notes/linear-algebra/03/"
          }
        ]
      },
      {
        "name": "方程、空间与映射",
        "chapters": [
          {
            "title": "线性方程组与高斯消元",
            "order": 4,
            "code": "LALG.04",
            "route": "/specials/math/notes/linear-algebra/04/"
          },
          {
            "title": "向量空间、子空间与张成",
            "order": 5,
            "code": "LALG.05",
            "route": "/specials/math/notes/linear-algebra/05/"
          },
          {
            "title": "线性无关、基、维数与坐标",
            "order": 6,
            "code": "LALG.06",
            "route": "/specials/math/notes/linear-algebra/06/"
          },
          {
            "title": "线性映射、矩阵表示与仿射变换",
            "order": 7,
            "code": "LALG.07",
            "route": "/specials/math/notes/linear-algebra/07/"
          },
          {
            "title": "秩、零空间、列空间与基本定理",
            "order": 8,
            "code": "LALG.08",
            "route": "/specials/math/notes/linear-algebra/08/"
          }
        ]
      },
      {
        "name": "几何与最佳拟合",
        "chapters": [
          {
            "title": "行列式的几何意义与计算",
            "order": 9,
            "code": "LALG.09",
            "route": "/specials/math/notes/linear-algebra/09/"
          },
          {
            "title": "正交性、投影与最小二乘",
            "order": 10,
            "code": "LALG.10",
            "route": "/specials/math/notes/linear-algebra/10/"
          }
        ]
      },
      {
        "name": "矩阵分解与表示",
        "chapters": [
          {
            "title": "正交基、Gram-Schmidt 与 QR 分解",
            "order": 11,
            "code": "LALG.11",
            "route": "/specials/math/notes/linear-algebra/11/"
          },
          {
            "title": "特征值、特征向量与对角化",
            "order": 12,
            "code": "LALG.12",
            "route": "/specials/math/notes/linear-algebra/12/"
          },
          {
            "title": "对称矩阵谱定理与二次型",
            "order": 13,
            "code": "LALG.13",
            "route": "/specials/math/notes/linear-algebra/13/"
          },
          {
            "title": "奇异值分解与伪逆",
            "order": 14,
            "code": "LALG.14",
            "route": "/specials/math/notes/linear-algebra/14/"
          },
          {
            "title": "PCA、低秩近似与表示学习",
            "order": 15,
            "code": "LALG.15",
            "route": "/specials/math/notes/linear-algebra/15/"
          }
        ]
      },
      {
        "name": "深度学习计算基础",
        "chapters": [
          {
            "title": "矩阵微积分与反向传播",
            "order": 16,
            "code": "LALG.16",
            "route": "/specials/math/notes/linear-algebra/16/"
          },
          {
            "title": "张量运算广播与爱因斯坦求和",
            "order": 17,
            "code": "LALG.17",
            "route": "/specials/math/notes/linear-algebra/17/"
          },
          {
            "title": "数值线性代数与稳定性",
            "order": 18,
            "code": "LALG.18",
            "route": "/specials/math/notes/linear-algebra/18/"
          },
          {
            "title": "机器学习深度学习中的线性代数",
            "order": 19,
            "code": "LALG.19",
            "route": "/specials/math/notes/linear-algebra/19/"
          }
        ]
      }
    ]
  },
  {
    "key": "exam-linear-algebra",
    "code": "EXAM",
    "name": "考研线性代数",
    "english": "EXAM LINEAR ALGEBRA",
    "summary": "以九讲和三轮复习为主线，强化定理条件、手算流程与综合题入口。",
    "visual": {
      "label": "EXAM / 01",
      "primary": "det(A - lambda I)",
      "operator": "=",
      "secondary": "0",
      "caption": "DETERMINANT · RANK · EIGENVALUE"
    },
    "total": 10,
    "route": "/specials/math/notes/exam-linear-algebra/00/",
    "groups": [
      {
        "name": "复习路线",
        "chapters": [
          {
            "title": "考研线性代数复习路线",
            "order": 0,
            "code": "EXAM.00",
            "route": "/specials/math/notes/exam-linear-algebra/00/"
          }
        ]
      },
      {
        "name": "行列式",
        "chapters": [
          {
            "title": "行列式的基本概念与计算",
            "order": 1,
            "code": "EXAM.01",
            "route": "/specials/math/notes/exam-linear-algebra/01/"
          },
          {
            "title": "行列式的综合计算与应用",
            "order": 2,
            "code": "EXAM.02",
            "route": "/specials/math/notes/exam-linear-algebra/02/"
          }
        ]
      },
      {
        "name": "矩阵、向量与方程组",
        "chapters": [
          {
            "title": "矩阵的基本概念与运算",
            "order": 3,
            "code": "EXAM.03",
            "route": "/specials/math/notes/exam-linear-algebra/03/"
          },
          {
            "title": "伴随矩阵、初等矩阵与矩阵方程",
            "order": 4,
            "code": "EXAM.04",
            "route": "/specials/math/notes/exam-linear-algebra/04/"
          },
          {
            "title": "向量",
            "order": 5,
            "code": "EXAM.05",
            "route": "/specials/math/notes/exam-linear-algebra/05/"
          },
          {
            "title": "线性方程组",
            "order": 6,
            "code": "EXAM.06",
            "route": "/specials/math/notes/exam-linear-algebra/06/"
          }
        ]
      },
      {
        "name": "特征结构与二次型",
        "chapters": [
          {
            "title": "特征值与特征向量",
            "order": 7,
            "code": "EXAM.07",
            "route": "/specials/math/notes/exam-linear-algebra/07/"
          },
          {
            "title": "相似矩阵与相似对角化",
            "order": 8,
            "code": "EXAM.08",
            "route": "/specials/math/notes/exam-linear-algebra/08/"
          },
          {
            "title": "二次型",
            "order": 9,
            "code": "EXAM.09",
            "route": "/specials/math/notes/exam-linear-algebra/09/"
          }
        ]
      }
    ]
  },
  {
    "key": "calculus",
    "code": "CALC",
    "name": "高等数学",
    "english": "CALCULUS & ANALYSIS",
    "summary": "从极限、导数与积分出发，串起微分方程、多元微积分、曲线曲面积分与无穷级数。",
    "visual": {
      "label": "CALCULUS / 01",
      "primary": "∫ f(x) dx",
      "operator": "=",
      "secondary": "F(b) − F(a)",
      "caption": "LIMIT · DERIVATIVE · INTEGRAL"
    },
    "total": 14,
    "route": "/specials/math/notes/calculus/00/",
    "groups": [
      {
        "name": "学习路线",
        "chapters": [
          {
            "title": "高等数学总览",
            "order": 0,
            "code": "CALC.00",
            "route": "/specials/math/notes/calculus/00/"
          }
        ]
      },
      {
        "name": "函数与极限",
        "chapters": [
          {
            "title": "第 1 章 函数与极限",
            "order": 1,
            "code": "CALC.01",
            "route": "/specials/math/notes/calculus/01/"
          }
        ]
      },
      {
        "name": "导数与微分",
        "chapters": [
          {
            "title": "第 2 章 导数与微分",
            "order": 2,
            "code": "CALC.02",
            "route": "/specials/math/notes/calculus/02/"
          },
          {
            "title": "第 3 章 微分中值定理与导数的应用",
            "order": 3,
            "code": "CALC.03",
            "route": "/specials/math/notes/calculus/03/"
          }
        ]
      },
      {
        "name": "一元积分",
        "chapters": [
          {
            "title": "第 4 章 不定积分",
            "order": 4,
            "code": "CALC.04",
            "route": "/specials/math/notes/calculus/04/"
          },
          {
            "title": "第 5 章 定积分",
            "order": 5,
            "code": "CALC.05",
            "route": "/specials/math/notes/calculus/05/"
          },
          {
            "title": "第 6 章 定积分的应用",
            "order": 6,
            "code": "CALC.06",
            "route": "/specials/math/notes/calculus/06/"
          }
        ]
      },
      {
        "name": "微分方程",
        "chapters": [
          {
            "title": "第 7 章 微分方程",
            "order": 7,
            "code": "CALC.07",
            "route": "/specials/math/notes/calculus/07/"
          }
        ]
      },
      {
        "name": "多元微积分",
        "chapters": [
          {
            "title": "第 8 章 向量代数与空间解析几何",
            "order": 8,
            "code": "CALC.08",
            "route": "/specials/math/notes/calculus/08/"
          },
          {
            "title": "第 9 章 多元函数微分学",
            "order": 9,
            "code": "CALC.09",
            "route": "/specials/math/notes/calculus/09/"
          },
          {
            "title": "第 10 章 重积分",
            "order": 10,
            "code": "CALC.10",
            "route": "/specials/math/notes/calculus/10/"
          }
        ]
      },
      {
        "name": "曲线积分与级数",
        "chapters": [
          {
            "title": "第 11 章 曲线积分与曲面积分",
            "order": 11,
            "code": "CALC.11",
            "route": "/specials/math/notes/calculus/11/"
          },
          {
            "title": "第 12 章 无穷级数",
            "order": 12,
            "code": "CALC.12",
            "route": "/specials/math/notes/calculus/12/"
          }
        ]
      },
      {
        "name": "附录速查",
        "chapters": [
          {
            "title": "附录 常用公式与结论速查",
            "order": 13,
            "code": "CALC.13",
            "route": "/specials/math/notes/calculus/13/"
          }
        ]
      }
    ]
  }
] as const
